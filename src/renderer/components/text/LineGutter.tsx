import type { AlignedRow, Side } from '@shared/types'
import { LINE_HEIGHT } from './constants'

interface Props {
  rows: AlignedRow[]
  side: Side
  scrollTop: number
  height: number
}

/**
 * Numeracion de lineas propia, alineada a la rejilla de filas y no al documento.
 *
 * Va fuera de CodeMirror precisamente porque tiene que dejar en blanco las filas
 * de hueco: el numero de linea de la izquierda y el de la derecha avanzan a
 * ritmos distintos, que es justo lo que hace legible una comparacion.
 */
export function LineGutter({ rows, side, scrollTop, height }: Props): React.JSX.Element {
  const first = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - 2)
  const last = Math.min(rows.length, Math.ceil((scrollTop + height) / LINE_HEIGHT) + 2)

  const visible: React.JSX.Element[] = []
  for (let index = first; index < last; index++) {
    const row = rows[index]
    if (!row) continue
    const line = side === 'left' ? row.left : row.right
    visible.push(
      <div
        key={index}
        className={`gutter-row${line === null ? ' gap' : ''} status-${row.status}`}
        style={{ top: index * LINE_HEIGHT - scrollTop }}
      >
        {line === null ? '' : line + 1}
      </div>
    )
  }

  return (
    <div className="line-gutter" style={{ width: gutterWidth(rows.length) }}>
      {visible}
    </div>
  )
}

function gutterWidth(rowCount: number): number {
  const digits = Math.max(2, String(rowCount).length)
  return digits * 7 + 12
}
