import type { DiffOp } from './lineDiff'
import type { PreparedDoc } from './normalize'

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
