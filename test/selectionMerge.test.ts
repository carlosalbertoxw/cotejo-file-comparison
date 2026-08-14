import { describe, expect, it } from 'vitest'
import { DEFAULT_DIFF_OPTIONS, type Side } from '@shared/types'
import { computeDiff } from '@renderer/diff/align'
import { computeMergeChange, docViewOf } from '@renderer/components/text/merge'
import { mapLineRange } from '@renderer/components/text/selectionMerge'

/** Transfiere las lineas seleccionadas de un lado al otro, como hace la vista. */
function transfer(
  left: string,
  right: string,
  from: Side,
  range: { start: number; end: number }
): string {
  const { rows } = computeDiff(left, right, DEFAULT_DIFF_OPTIONS)
  const source = from === 'left' ? left : right
  const target = from === 'left' ? right : left
  const sourceLines = source.split('\n').slice(range.start, range.end)
  const change = computeMergeChange(sourceLines, docViewOf(target), mapLineRange(rows, from, range))
  return target.slice(0, change.from) + change.insert + target.slice(change.to)
}

describe('mapLineRange', () => {
  const rows = computeDiff('a\nX\nc', 'a\nb\nc', DEFAULT_DIFF_OPTIONS).rows

  it('empareja una linea con la que tiene enfrente', () => {
    expect(mapLineRange(rows, 'left', { start: 1, end: 2 })).toEqual({ start: 1, end: 2 })
  })

  it('empareja un rango completo', () => {
    expect(mapLineRange(rows, 'left', { start: 0, end: 3 })).toEqual({ start: 0, end: 3 })
  })

  it('funciona igual en sentido contrario', () => {
    expect(mapLineRange(rows, 'right', { start: 1, end: 2 })).toEqual({ start: 1, end: 2 })
  })

  it('devuelve un rango vacio cuando enfrente solo hay hueco', () => {
    // La derecha no tiene nada frente a las lineas anadidas en la izquierda.
    const added = computeDiff('a\nX\nY\nb', 'a\nb', DEFAULT_DIFF_OPTIONS).rows
    expect(mapLineRange(added, 'left', { start: 1, end: 3 })).toEqual({ start: 1, end: 1 })
  })

  it('arrastra las lineas huerfanas intercaladas del otro lado', () => {
    // La Q de la derecha queda entre las dos lineas seleccionadas: entra.
    const uneven = computeDiff('a\nX\nY\nb', 'a\nX\nQ\nY\nb', DEFAULT_DIFF_OPTIONS).rows
    expect(mapLineRange(uneven, 'left', { start: 1, end: 3 })).toEqual({ start: 1, end: 4 })
  })

  it('deja fuera lo que no esta enfrente de la seleccion', () => {
    // La Q de la derecha cae debajo de la seleccion, no enfrente: se queda.
    const uneven = computeDiff('a\nX\nb', 'a\nP\nQ\nb', DEFAULT_DIFF_OPTIONS).rows
    expect(mapLineRange(uneven, 'left', { start: 1, end: 2 })).toEqual({ start: 1, end: 2 })
  })

  it('sin filas devuelve el principio', () => {
    expect(mapLineRange([], 'left', { start: 3, end: 5 })).toEqual({ start: 0, end: 0 })
  })
})

describe('transferir la seleccion', () => {
  it('lleva una linea cambiada a la derecha', () => {
    expect(transfer('a\nX\nc', 'a\nb\nc', 'left', { start: 1, end: 2 })).toBe('a\nX\nc')
  })

  it('lleva una linea cambiada a la izquierda', () => {
    expect(transfer('a\nX\nc', 'a\nb\nc', 'right', { start: 1, end: 2 })).toBe('a\nb\nc')
  })

  it('inserta lo que el otro lado no tiene', () => {
    expect(transfer('a\nX\nY\nb', 'a\nb', 'left', { start: 1, end: 3 })).toBe('a\nX\nY\nb')
  })

  it('se lleva por delante lo que quedaba intercalado', () => {
    expect(transfer('a\nX\nY\nb', 'a\nX\nQ\nY\nb', 'left', { start: 1, end: 3 })).toBe('a\nX\nY\nb')
  })

  it('seleccionar el archivo entero iguala los dos lados', () => {
    const left = 'a\nX\nb\nY\nc'
    const right = 'a\nP\nQ\nc'
    const lines = left.split('\n').length
    expect(transfer(left, right, 'left', { start: 0, end: lines })).toBe(left)
  })

  it('transferir la ultima linea no anade un salto de mas', () => {
    expect(transfer('a\nb\nZ', 'a\nb\nc', 'left', { start: 2, end: 3 })).toBe('a\nb\nZ')
  })

  it('transferir al final de un archivo mas corto lo alarga', () => {
    expect(transfer('a\nb\nc', 'a\nb', 'left', { start: 2, end: 3 })).toBe('a\nb\nc')
  })
})
