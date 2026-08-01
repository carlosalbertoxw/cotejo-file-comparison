import type { AlignedRow, DiffBlock, DiffOptions, DiffResult, RowStatus } from '@shared/types'
import { prepareDoc } from './normalize'
import { diffLineKeys } from './lineDiff'
import { pairSegments, type Segment } from './pairing'
import { inlineRanges } from './inlineDiff'

/** Por encima de esto no se calcula el resaltado intra-linea. */
const MAX_INLINE_ROWS = 200_000

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
  computeInline: boolean
): { rows: AlignedRow[]; blocks: DiffBlock[] } {
  const rows: AlignedRow[] = []
  const blocks: DiffBlock[] = []

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
      const paired = Math.min(leftCount, rightCount)
      for (let i = 0; i < paired; i++) {
        const left = segment.leftStart + i
        const right = segment.rightStart + i
        const row: AlignedRow = { status: 'changed', left, right, block: blockIndex }
        if (computeInline) {
          const ranges = inlineRanges(leftLines[left] as string, rightLines[right] as string)
          row.leftInline = ranges.left
          row.rightInline = ranges.right
        }
        rows.push(row)
      }
      // Lo que sobra de un lado son lineas sin pareja dentro del mismo bloque.
      for (let i = paired; i < leftCount; i++) {
        rows.push({
          status: 'leftOnly',
          left: segment.leftStart + i,
          right: null,
          block: blockIndex
        })
      }
      for (let i = paired; i < rightCount; i++) {
        rows.push({
          status: 'rightOnly',
          left: null,
          right: segment.rightStart + i,
          block: blockIndex
        })
      }
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
  const segments = pairSegments(ops, leftDoc, rightDoc)

  const totalLines = leftDoc.lines.length + rightDoc.lines.length
  const computeInline = totalLines <= MAX_INLINE_ROWS

  const { rows, blocks } = buildRows(segments, leftDoc.lines, rightDoc.lines, computeInline)

  const stats = { equal: 0, changed: 0, leftOnly: 0, rightOnly: 0, ignored: 0 }
  for (const row of rows) stats[row.status]++

  return { rows, blocks, stats, inlineSkipped: !computeInline }
}
