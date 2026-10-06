import { describe, expect, it } from 'vitest'
import { DEFAULT_DIFF_OPTIONS, type AlignedRow } from '@shared/types'
import { computeDiff } from '@renderer/diff/align'
import { deriveAlignment, rowOfLine } from '@renderer/components/text/alignment'

/**
 * `deriveAlignment` es lo que mantiene los dos paneles a la misma altura: de
 * la rejilla saca cuantas filas de relleno van antes de cada linea. Si se
 * equivoca en una, los paneles se desincronizan al hacer scroll y las flechas
 * de copiar apuntan a la linea de al lado.
 */

function row(status: AlignedRow['status'], left: number | null, right: number | null): AlignedRow {
  return { status, left, right, block: status === 'equal' ? -1 : 0 }
}

const ROWS: AlignedRow[] = [
  row('equal', 0, 0),
  row('rightOnly', null, 1),
  row('rightOnly', null, 2),
  row('changed', 1, 3),
  row('leftOnly', 2, null),
  row('equal', 3, 4),
  row('rightOnly', null, 5)
]

describe('deriveAlignment', () => {
  it('pone el relleno antes de la linea que sigue al hueco', () => {
    const left = deriveAlignment(ROWS, 'left')
    expect([...left.gapsBefore]).toEqual([[1, 2]])
    expect(left.trailingGap).toBe(1)

    const right = deriveAlignment(ROWS, 'right')
    expect([...right.gapsBefore]).toEqual([[4, 1]])
    expect(right.trailingGap).toBe(0)
  })

  it('anota el estado de cada linea de su lado', () => {
    const left = deriveAlignment(ROWS, 'left')
    expect(left.lineStatus.get(1)).toBe('changed')
    expect(left.lineStatus.get(2)).toBe('leftOnly')
    expect(left.lineStatus.has(4)).toBe(false)
  })

  it('solo guarda los tramos de palabra que existen', () => {
    const rows: AlignedRow[] = [
      { ...row('changed', 0, 0), leftInline: [{ from: 2, to: 5 }], rightInline: [] }
    ]
    expect([...deriveAlignment(rows, 'left').inline]).toEqual([[0, [{ from: 2, to: 5 }]]])
    expect(deriveAlignment(rows, 'right').inline.size).toBe(0)
  })

  it('lineas y relleno suman siempre el alto de la rejilla, en los dos lados', () => {
    const left = ['a', 'b', 'c', 'd', 'e', 'f'].join('\n')
    const right = ['x', 'a', 'c', 'D', 'e', 'g', 'h'].join('\n')
    const { rows } = computeDiff(left, right, DEFAULT_DIFF_OPTIONS)

    for (const side of ['left', 'right'] as const) {
      const alignment = deriveAlignment(rows, side)
      const lines = side === 'left' ? 6 : 7
      const gaps = [...alignment.gapsBefore.values()].reduce((sum, count) => sum + count, 0)
      expect(lines + gaps + alignment.trailingGap).toBe(rows.length)
    }
  })
})

describe('rowOfLine', () => {
  it('encuentra la fila de una linea de cada lado', () => {
    expect(rowOfLine(ROWS, 'left', 1)).toBe(3)
    expect(rowOfLine(ROWS, 'right', 5)).toBe(6)
  })

  it('una linea que no esta cae en la primera fila', () => {
    expect(rowOfLine(ROWS, 'left', 99)).toBe(0)
  })
})
