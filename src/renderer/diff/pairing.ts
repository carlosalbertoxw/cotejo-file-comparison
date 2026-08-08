import type { DiffOp } from './lineDiff'
import type { PreparedDoc } from './normalize'
import { MAX_ALIGNABLE_CELLS } from './similarity'

export type SegmentType = 'equal' | 'changed' | 'leftOnly' | 'rightOnly'

/** Tramo del resultado, ya expresado en indices de linea reales del documento. */
export interface Segment {
  type: SegmentType
  leftStart: number
  leftEnd: number
  rightStart: number
  rightEnd: number
}

/**
 * Traduce un rango sobre las claves comparadas a un rango de lineas reales.
 *
 * Con `ignoreBlankLines` hay lineas que no participan en la comparacion pero
 * siguen estando en el documento. Cada una viaja junto al tramo que la precede,
 * de modo que los rangos siguen cubriendo el documento entero sin huecos.
 */
function toOriginalRange(doc: PreparedDoc, keyStart: number, keyEnd: number): [number, number] {
  const start = keyStart === 0 ? 0 : (doc.originalIndex[keyStart] ?? doc.lines.length)
  const end = keyEnd >= doc.keys.length ? doc.lines.length : (doc.originalIndex[keyEnd] as number)
  return [start, end]
}

/**
 * Convierte las operaciones crudas en tramos con significado visual.
 *
 * La clave esta en fusionar un `delete` con el `insert` que le sigue: eso es lo
 * que produce un bloque "cambiado" con las lineas enfrentadas, en vez de un
 * bloque de borrados seguido de otro de inserciones sin relacion visible.
 */
export function pairSegments(
  ops: DiffOp[],
  leftDoc: PreparedDoc,
  rightDoc: PreparedDoc
): Segment[] {
  const segments: Segment[] = []

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i] as DiffOp

    if (op.type === 'equal') {
      const [leftStart, leftEnd] = toOriginalRange(leftDoc, op.aStart, op.aEnd)
      const [rightStart, rightEnd] = toOriginalRange(rightDoc, op.bStart, op.bEnd)
      segments.push({ type: 'equal', leftStart, leftEnd, rightStart, rightEnd })
      continue
    }

    const next = ops[i + 1]
    const isPair =
      next !== undefined &&
      ((op.type === 'delete' && next.type === 'insert') ||
        (op.type === 'insert' && next.type === 'delete'))

    if (isPair) {
      const del = op.type === 'delete' ? op : (next as DiffOp)
      const ins = op.type === 'insert' ? op : (next as DiffOp)
      const [leftStart, leftEnd] = toOriginalRange(leftDoc, del.aStart, del.aEnd)
      const [rightStart, rightEnd] = toOriginalRange(rightDoc, ins.bStart, ins.bEnd)
      segments.push({ type: 'changed', leftStart, leftEnd, rightStart, rightEnd })
      i++ // el `next` ya quedo consumido dentro de este tramo
      continue
    }

    if (op.type === 'delete') {
      const [leftStart, leftEnd] = toOriginalRange(leftDoc, op.aStart, op.aEnd)
      const [rightStart] = toOriginalRange(rightDoc, op.bStart, op.bStart)
      segments.push({
        type: 'leftOnly',
        leftStart,
        leftEnd,
        rightStart,
        rightEnd: rightStart
      })
    } else {
      const [rightStart, rightEnd] = toOriginalRange(rightDoc, op.bStart, op.bEnd)
      const [leftStart] = toOriginalRange(leftDoc, op.aStart, op.aStart)
      segments.push({
        type: 'rightOnly',
        leftStart,
        leftEnd: leftStart,
        rightStart,
        rightEnd
      })
    }
  }

  return segments
}

/** Tramos iguales mas largos que esto ya son contexto de verdad, no ruido. */
const MAX_NOISE_RUN = 3

/**
 * Una linea que no dice nada sobre donde esta el lector: vacia, o un par de
 * signos como `{`, `}`, `});` o `,`. Coinciden en todas partes, asi que
 * encontrarla igual a los dos lados no es informacion.
 */
function isNoiseLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed === '') return true
  return trimmed.length <= 3 && !/[\p{L}\p{N}]/u.test(trimmed)
}

function isNoiseSegment(segment: Segment, leftLines: string[], rightLines: string[]): boolean {
  if (segment.leftEnd - segment.leftStart > MAX_NOISE_RUN) return false
  if (segment.rightEnd - segment.rightStart > MAX_NOISE_RUN) return false
  for (let i = segment.leftStart; i < segment.leftEnd; i++) {
    if (!isNoiseLine(leftLines[i] as string)) return false
  }
  for (let i = segment.rightStart; i < segment.rightEnd; i++) {
    if (!isNoiseLine(rightLines[i] as string)) return false
  }
  return true
}

/**
 * Absorbe los tramos iguales de puro ruido que quedan atrapados entre cambios.
 *
 * Cuando se reescribe un bloque entero, el diff por lineas casi siempre
 * encuentra alguna llave o linea en blanco identica en medio y la declara
 * igual. El resultado es que la reescritura se parte en trozos anclados a esas
 * llaves, y el texto de alrededor aparece desplazado una o dos lineas: es
 * exactamente lo que hace ilegible la comparacion. Uniendolos en un solo tramo
 * modificado, el emparejado por parecido puede alinear el bloque completo.
 *
 * El tope de tamano no es cosmetico: mas alla de el la alineacion fina se
 * desactiva, asi que fundir tramos solo empeoraria el resultado.
 */
export function absorbNoiseEqualities(
  segments: Segment[],
  leftLines: string[],
  rightLines: string[]
): Segment[] {
  const merged: Segment[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i] as Segment

    if (segment.type === 'equal') {
      merged.push(segment)
      continue
    }

    let last = segment
    // Se avanza de dos en dos: un tramo igual de ruido y el cambio que lo sigue.
    while (i + 2 < segments.length) {
      const between = segments[i + 1] as Segment
      const next = segments[i + 2] as Segment
      if (between.type !== 'equal' || next.type === 'equal') break
      if (!isNoiseSegment(between, leftLines, rightLines)) break

      const leftCount = next.leftEnd - segment.leftStart
      const rightCount = next.rightEnd - segment.rightStart
      if (leftCount * rightCount > MAX_ALIGNABLE_CELLS) break

      last = next
      i += 2
    }

    if (last === segment) {
      merged.push(segment)
      continue
    }

    merged.push({
      type: 'changed',
      leftStart: segment.leftStart,
      leftEnd: last.leftEnd,
      rightStart: segment.rightStart,
      rightEnd: last.rightEnd
    })
  }

  return merged
}
