import type { AlignedRow, Side } from '@shared/types'
import type { LineRange } from './merge'

const OTHER: Record<Side, Side> = { left: 'right', right: 'left' }

/** Linea de un lado en una fila alineada, o null si ahi hay un hueco. */
function lineAt(row: AlignedRow, side: Side): number | null {
  return side === 'left' ? row.left : row.right
}

/**
 * Donde insertar en el otro lado un texto que llega antes de `sourceLine`.
 *
 * Se toma la ultima linea del destino que queda por encima: asi lo transferido
 * cae en el mismo sitio en el que se ve el hueco.
 */
function insertionPoint(rows: AlignedRow[], from: Side, sourceLine: number): number {
  const to = OTHER[from]
  let point = 0
  for (const row of rows) {
    const source = lineAt(row, from)
    if (source !== null && source >= sourceLine) break
    const target = lineAt(row, to)
    if (target !== null) point = target + 1
  }
  return point
}

/**
 * Traduce un rango de lineas de un lado al rango equivalente del otro.
 *
 * La rejilla alineada es la que manda: se devuelve el tramo del otro lado que
 * queda enfrentado a la seleccion, con las lineas huerfanas que caigan entre
 * medias. Lo que queda por encima o por debajo de esas filas no se toca aunque
 * pertenezca al mismo bloque; para eso estan las flechas del bloque entero.
 * Cuando enfrente solo hay huecos el rango sale vacio y transferir es insertar.
 */
export function mapLineRange(rows: AlignedRow[], from: Side, range: LineRange): LineRange {
  const to = OTHER[from]

  let firstRow = -1
  let lastRow = -1
  for (let i = 0; i < rows.length; i++) {
    const source = lineAt(rows[i] as AlignedRow, from)
    if (source === null || source < range.start || source >= range.end) continue
    if (firstRow === -1) firstRow = i
    lastRow = i
  }

  if (firstRow === -1) {
    const point = insertionPoint(rows, from, range.start)
    return { start: point, end: point }
  }

  let start = -1
  let end = -1
  for (let i = firstRow; i <= lastRow; i++) {
    const target = lineAt(rows[i] as AlignedRow, to)
    if (target === null) continue
    if (start === -1) start = target
    end = target + 1
  }

  if (start === -1) {
    const point = insertionPoint(rows, from, range.start)
    return { start: point, end: point }
  }

  return { start, end }
}
