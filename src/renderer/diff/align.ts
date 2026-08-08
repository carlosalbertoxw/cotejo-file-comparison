import type { AlignedRow, DiffBlock, DiffOptions, DiffResult, RowStatus } from '@shared/types'
import { normalizeLine, prepareDoc } from './normalize'
import { diffLineKeys } from './lineDiff'
import { absorbNoiseEqualities, pairSegments, type Segment } from './pairing'
import { inlineRanges } from './inlineDiff'
import { MAX_ALIGNABLE_CELLS, matchSimilarLines } from './similarity'

/** Por encima de esto no se calcula el resaltado intra-linea. */
const MAX_INLINE_ROWS = 200_000

/**
 * Clave con la que se mide el parecido entre dos lineas: siempre sin
 * indentacion ni espaciado interno, aunque la comparacion sea estricta. Un
 * cambio de sangrado no convierte una linea en otra distinta; que la diferencia
 * se vea es cosa del estado de la fila, no de con quien se empareja.
 */
function similarityKeys(
  lines: string[],
  start: number,
  end: number,
  options: DiffOptions
): string[] {
  const keys: string[] = []
  for (let i = start; i < end; i++) {
    keys.push(normalizeLine(lines[i] as string, { ...options, ignoreWhitespace: true }))
  }
  return keys
}

/**
 * Convierte los tramos en la rejilla de filas que pinta la vista.
 *
 * Cada fila ocupa exactamente una linea de alto en los dos paneles; cuando un
 * lado no tiene contenido, su indice es null y ahi se dibuja un hueco. Es esta
 * correspondencia 1:1 entre filas la que mantiene los dos paneles cuadrados.
 */
function buildRows(
  segments: Segment[],
  leftLines: string[],
  rightLines: string[],
  computeInline: boolean,
  options: DiffOptions
): { rows: AlignedRow[]; blocks: DiffBlock[] } {
  const rows: AlignedRow[] = []
  const blocks: DiffBlock[] = []

  /** Fila con las dos lineas enfrentadas dentro de un bloque modificado. */
  const pushPair = (left: number, right: number, block: number): void => {
    const leftLine = leftLines[left] as string
    const rightLine = rightLines[right] as string
    // Emparejar no implica diferir: al fundir tramos, dentro de un bloque
    // pueden quedar lineas identicas, y pintarlas como cambio seria mentir.
    const status: RowStatus =
      leftLine === rightLine
        ? 'equal'
        : normalizeLine(leftLine, options) === normalizeLine(rightLine, options)
          ? 'ignored'
          : 'changed'

    const row: AlignedRow = { status, left, right, block }
    if (status === 'changed' && computeInline) {
      const ranges = inlineRanges(leftLine, rightLine)
      row.leftInline = ranges.left
      row.rightInline = ranges.right
    }
    rows.push(row)
  }

  /**
   * Tramo sin ninguna pareja fiable: se enfrentan por posicion y lo que sobra
   * de un lado queda huerfano. Es lo mejor que se puede hacer cuando no hay
   * parecido en el que apoyarse, y mantiene compacta la rejilla.
   */
  const fillUnmatched = (
    leftStart: number,
    leftEnd: number,
    rightStart: number,
    rightEnd: number,
    block: number
  ): void => {
    const paired = Math.min(leftEnd - leftStart, rightEnd - rightStart)
    for (let i = 0; i < paired; i++) pushPair(leftStart + i, rightStart + i, block)
    for (let i = leftStart + paired; i < leftEnd; i++) {
      rows.push({ status: 'leftOnly', left: i, right: null, block })
    }
    for (let i = rightStart + paired; i < rightEnd; i++) {
      rows.push({ status: 'rightOnly', left: null, right: i, block })
    }
  }

  for (const segment of segments) {
    const leftCount = segment.leftEnd - segment.leftStart
    const rightCount = segment.rightEnd - segment.rightStart

    if (segment.type === 'equal') {
      const paired = Math.min(leftCount, rightCount)
      for (let i = 0; i < paired; i++) {
        const left = segment.leftStart + i
        const right = segment.rightStart + i
        // Si las lineas crudas difieren, la igualdad viene de las opciones de
        // comparacion, no del contenido: eso es `ignored`, no `equal`.
        const status: RowStatus = leftLines[left] === rightLines[right] ? 'equal' : 'ignored'
        rows.push({ status, left, right, block: -1 })
      }
      // Sobrante: lineas descartadas por `ignoreBlankLines` en un solo lado.
      for (let i = paired; i < leftCount; i++) {
        rows.push({ status: 'ignored', left: segment.leftStart + i, right: null, block: -1 })
      }
      for (let i = paired; i < rightCount; i++) {
        rows.push({ status: 'ignored', left: null, right: segment.rightStart + i, block: -1 })
      }
      continue
    }

    const blockIndex = blocks.length
    const startRow = rows.length

    if (segment.type === 'changed') {
      // Las anclas son las lineas que se reconocen entre si pese a los
      // retoques; entre ancla y ancla ya no queda nada parecido que alinear.
      // En un bloque desmesurado ni se preparan las claves: no se van a usar.
      const anchors =
        leftCount * rightCount > MAX_ALIGNABLE_CELLS
          ? []
          : matchSimilarLines(
              similarityKeys(leftLines, segment.leftStart, segment.leftEnd, options),
              similarityKeys(rightLines, segment.rightStart, segment.rightEnd, options)
            )

      let left = segment.leftStart
      let right = segment.rightStart
      for (const anchor of anchors) {
        const anchorLeft = segment.leftStart + anchor.left
        const anchorRight = segment.rightStart + anchor.right
        fillUnmatched(left, anchorLeft, right, anchorRight, blockIndex)
        pushPair(anchorLeft, anchorRight, blockIndex)
        left = anchorLeft + 1
        right = anchorRight + 1
      }
      fillUnmatched(left, segment.leftEnd, right, segment.rightEnd, blockIndex)
    } else if (segment.type === 'leftOnly') {
      for (let i = 0; i < leftCount; i++) {
        rows.push({
          status: 'leftOnly',
          left: segment.leftStart + i,
          right: null,
          block: blockIndex
        })
      }
    } else {
      for (let i = 0; i < rightCount; i++) {
        rows.push({
          status: 'rightOnly',
          left: null,
          right: segment.rightStart + i,
          block: blockIndex
        })
      }
    }

    blocks.push({
      index: blockIndex,
      status: segment.type,
      startRow,
      endRow: rows.length,
      leftStart: segment.leftStart,
      leftEnd: segment.leftEnd,
      rightStart: segment.rightStart,
      rightEnd: segment.rightEnd
    })
  }

  return { rows, blocks }
}

/**
 * Punto de entrada del motor: dos textos y unas opciones, una rejilla alineada.
 * Los dos textos deben venir ya normalizados a LF.
 */
export function computeDiff(
  leftText: string,
  rightText: string,
  options: DiffOptions
): DiffResult {
  const leftDoc = prepareDoc(leftText, options)
  const rightDoc = prepareDoc(rightText, options)

  const ops = diffLineKeys(leftDoc.keys, rightDoc.keys)
  const segments = absorbNoiseEqualities(
    pairSegments(ops, leftDoc, rightDoc),
    leftDoc.lines,
    rightDoc.lines
  )

  const totalLines = leftDoc.lines.length + rightDoc.lines.length
  const computeInline = totalLines <= MAX_INLINE_ROWS

  const { rows, blocks } = buildRows(
    segments,
    leftDoc.lines,
    rightDoc.lines,
    computeInline,
    options
  )

  const stats = { equal: 0, changed: 0, leftOnly: 0, rightOnly: 0, ignored: 0 }
  for (const row of rows) stats[row.status]++

  return { rows, blocks, stats, inlineSkipped: !computeInline }
}
