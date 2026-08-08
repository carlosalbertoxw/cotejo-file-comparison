import { describe, expect, it } from 'vitest'
import { MAX_ALIGNABLE_CELLS, matchSimilarLines } from '@renderer/diff/similarity'

describe('matchSimilarLines', () => {
  it('reconoce una linea retocada por encima de una insercion', () => {
    const matches = matchSimilarLines(
      ['total = uno + dos'],
      ['const cabecera = 1', 'total = uno + dos + tres']
    )
    expect(matches).toEqual([{ left: 0, right: 1 }])
  })

  it('no empareja lineas que no se parecen', () => {
    expect(matchSimilarLines(['alfa'], ['zulu'])).toEqual([])
  })

  it('nunca cruza las parejas', () => {
    const alfa = 'funcion alfa devuelve uno'
    const beta = 'procedimiento beta imprime dos'
    // Se intercambian de orden: solo una puede emparejarse sin cruzar.
    expect(matchSimilarLines([alfa, beta], [beta, alfa])).toHaveLength(1)
  })

  it('prefiere la linea larga cuando compite con un simbolo suelto', () => {
    const matches = matchSimilarLines(
      ['}', 'public static void main(string[] args)'],
      ['public static void main(string[] args)', '}']
    )
    expect(matches).toEqual([{ left: 1, right: 0 }])
  })

  it('empareja simbolos identicos cuando no estorban a nadie', () => {
    expect(matchSimilarLines(['{'], ['{'])).toEqual([{ left: 0, right: 0 }])
  })

  it('se rinde en bloques por encima del presupuesto', () => {
    const size = Math.ceil(Math.sqrt(MAX_ALIGNABLE_CELLS)) + 1
    const lines = Array.from({ length: size }, (_, i) => `linea numero ${i}`)
    expect(matchSimilarLines(lines, lines)).toEqual([])
  })
})
