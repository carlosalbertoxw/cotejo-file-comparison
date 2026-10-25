import { describe, expect, it } from 'vitest'
import { DEFAULT_DIFF_OPTIONS, type Side } from '@shared/types'
import { computeDiff } from '@renderer/diff/align'
import { EditorSelection, EditorState, Text } from '@codemirror/state'
import {
  computeMergeChange,
  docViewOf,
  transferChanges,
  type LineRange
} from '@renderer/components/text/merge'
import { lineSelectionsOf, mapLineRange } from '@renderer/components/text/selectionMerge'

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

/** Transfiere varios tramos a la vez, como hace la vista con una seleccion multiple. */
function transferMany(left: string, right: string, from: Side, ranges: LineRange[]): string {
  const { rows } = computeDiff(left, right, DEFAULT_DIFF_OPTIONS)
  const source = Text.of((from === 'left' ? left : right).split('\n'))
  const target = Text.of((from === 'left' ? right : left).split('\n'))
  const changes = transferChanges(
    source,
    target,
    ranges.map((range) => ({ source: range, target: mapLineRange(rows, from, range) }))
  )
  return changes.apply(target).toString()
}

describe('transferir varios tramos a la vez', () => {
  it('lleva cada tramo a su sitio y deja lo de en medio', () => {
    const left = 'a\nX\nb\nc\nY\nd'
    const right = 'a\n1\nb\nc\n2\nd'
    expect(transferMany(left, right, 'left', [range(1, 2), range(4, 5)])).toBe(left)
  })

  it('no toca las diferencias que no se seleccionaron', () => {
    const left = 'a\nX\nb\nY\nc\nZ\nd'
    const right = 'a\n1\nb\n2\nc\n3\nd'
    expect(transferMany(left, right, 'left', [range(1, 2), range(5, 6)])).toBe(
      'a\nX\nb\n2\nc\nZ\nd'
    )
  })

  it('mezcla inserciones y sustituciones que cambian el numero de lineas', () => {
    // El primer tramo inserta dos lineas; el segundo sustituye una: lo de
    // abajo no se descoloca por lo que crece arriba.
    const left = 'a\nN1\nN2\nb\nX\nc'
    const right = 'a\nb\n1\nc'
    expect(transferMany(left, right, 'left', [range(1, 3), range(4, 5)])).toBe(left)
  })

  it('dos inserciones en el mismo punto quedan en el orden del origen', () => {
    // Las dos caen frente al mismo hueco de la derecha.
    const left = 'a\nP\nQ\nR\nb'
    const right = 'a\nb'
    expect(transferMany(left, right, 'left', [range(1, 2), range(3, 4)])).toBe('a\nP\nR\nb')
  })

  it('funciona de derecha a izquierda', () => {
    const left = 'a\n1\nb\n2\nc'
    const right = 'a\nX\nb\nY\nc'
    expect(transferMany(left, right, 'right', [range(1, 2), range(3, 4)])).toBe(right)
  })
})

describe('lineSelectionsOf', () => {
  const doc = 'uno\ndos\ntres\ncuatro\ncinco'
  const at = (line: number, column = 0): number =>
    doc.split('\n').slice(0, line).join('\n').length + (line > 0 ? 1 : 0) + column

  function selections(...ranges: [number, number][]): LineRange[] {
    const state = EditorState.create({
      doc,
      extensions: EditorState.allowMultipleSelections.of(true),
      selection: EditorSelection.create(
        ranges.map(([from, to]) => EditorSelection.range(from, to))
      )
    })
    return lineSelectionsOf(state)
  }

  it('sin nada seleccionado no hay tramos', () => {
    expect(selections([at(1), at(1)])).toEqual([])
  })

  it('devuelve cada tramo en orden, aunque se seleccionaran al reves', () => {
    expect(selections([at(3), at(3, 2)], [at(0), at(0, 2)])).toEqual([range(0, 1), range(3, 4)])
  })

  it('junta los tramos que tocan lineas seguidas', () => {
    expect(selections([at(0), at(0, 2)], [at(1, 1), at(1, 2)])).toEqual([range(0, 2)])
  })

  it('una seleccion que acaba al principio de una linea no la incluye', () => {
    expect(selections([at(1), at(3)])).toEqual([range(1, 3)])
  })
})

function range(start: number, end: number): LineRange {
  return { start, end }
}
