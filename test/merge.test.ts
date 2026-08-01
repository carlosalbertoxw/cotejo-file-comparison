import { describe, expect, it } from 'vitest'
import { DEFAULT_DIFF_OPTIONS } from '@shared/types'
import { computeDiff } from '@renderer/diff/align'
import { computeMergeChange, docViewOf } from '@renderer/components/text/merge'

/** Aplica el cambio calculado sobre el texto destino, como hace CodeMirror. */
function applyMerge(
  sourceText: string,
  targetText: string,
  sourceRange: { start: number; end: number },
  targetRange: { start: number; end: number }
): string {
  const sourceLines = sourceText.split('\n').slice(sourceRange.start, sourceRange.end)
  const change = computeMergeChange(sourceLines, docViewOf(targetText), targetRange)
  return targetText.slice(0, change.from) + change.insert + targetText.slice(change.to)
}

describe('computeMergeChange', () => {
  it('sustituye una linea en el medio', () => {
    expect(applyMerge('a\nX\nc', 'a\nb\nc', { start: 1, end: 2 }, { start: 1, end: 2 })).toBe(
      'a\nX\nc'
    )
  })

  it('sustituye varias lineas por una sola', () => {
    expect(
      applyMerge('a\nX\nd', 'a\nb\nc\nd', { start: 1, end: 2 }, { start: 1, end: 3 })
    ).toBe('a\nX\nd')
  })

  it('sustituye una linea por varias', () => {
    expect(
      applyMerge('a\nX\nY\nd', 'a\nb\nd', { start: 1, end: 3 }, { start: 1, end: 2 })
    ).toBe('a\nX\nY\nd')
  })

  it('inserta donde el destino no tiene nada (rango vacio)', () => {
    expect(applyMerge('a\nX\nb', 'a\nb', { start: 1, end: 2 }, { start: 1, end: 1 })).toBe(
      'a\nX\nb'
    )
  })

  it('borra las lineas del destino cuando el origen esta vacio', () => {
    expect(applyMerge('a\nc', 'a\nb\nc', { start: 1, end: 1 }, { start: 1, end: 2 })).toBe('a\nc')
  })

  it('no deja una linea vacia al borrar el final del documento', () => {
    expect(applyMerge('a', 'a\nb\nc', { start: 1, end: 1 }, { start: 1, end: 3 })).toBe('a')
  })

  it('sustituye la ultima linea sin anadir salto de mas', () => {
    expect(applyMerge('a\nZ', 'a\nb', { start: 1, end: 2 }, { start: 1, end: 2 })).toBe('a\nZ')
  })

  it('anade al final de un documento que no termina en salto de linea', () => {
    expect(applyMerge('a\nb\nc', 'a\nb', { start: 2, end: 3 }, { start: 2, end: 2 })).toBe('a\nb\nc')
  })

  it('inserta en un documento vacio', () => {
    expect(applyMerge('x\ny', '', { start: 0, end: 2 }, { start: 0, end: 0 })).toBe('x\ny')
  })

  it('vacia por completo el documento destino', () => {
    expect(applyMerge('', 'a\nb', { start: 0, end: 0 }, { start: 0, end: 2 })).toBe('')
  })
})

describe('merge sobre bloques reales del diff', () => {
  /** Aplicar todos los bloques de izquierda a derecha debe igualar los dos lados. */
  function mergeAllToRight(left: string, right: string): string {
    const { blocks } = computeDiff(left, right, DEFAULT_DIFF_OPTIONS)
    const leftLines = left.split('\n')
    let result = right
    // De abajo hacia arriba: asi los indices de los bloques de mas arriba
    // siguen siendo validos despues de cada cambio.
    for (const block of [...blocks].reverse()) {
      const sourceLines = leftLines.slice(block.leftStart, block.leftEnd)
      const change = computeMergeChange(sourceLines, docViewOf(result), {
        start: block.rightStart,
        end: block.rightEnd
      })
      result = result.slice(0, change.from) + change.insert + result.slice(change.to)
    }
    return result
  }

  const cases: [string, string, string][] = [
    ['cambio simple', 'a\nb\nc', 'a\nB\nc'],
    ['insercion', 'a\nb\nc', 'a\nc'],
    ['borrado', 'a\nc', 'a\nb\nc'],
    ['bloques multiples', 'a\nX\nb\nY\nc', 'a\nP\nb\nQ\nc'],
    ['diferencia al principio', 'X\nb\nc', 'a\nb\nc'],
    ['diferencia al final', 'a\nb\nX', 'a\nb\nc'],
    ['anadido al final', 'a\nb\nc\nd', 'a\nb'],
    ['recorte del final', 'a\nb', 'a\nb\nc\nd'],
    ['lado derecho vacio', 'a\nb\nc', ''],
    ['lado izquierdo vacio', '', 'a\nb\nc'],
    ['sin nada en comun', 'x\ny\nz', 'a\nb\nc'],
    ['huerfano y cambio juntos', 'a\nX\nY\nZ\nb', 'a\nP\nb']
  ]

  for (const [name, left, right] of cases) {
    it(`aplicar todo hacia la derecha deja los dos lados iguales: ${name}`, () => {
      expect(mergeAllToRight(left, right)).toBe(left)
    })
  }
})
