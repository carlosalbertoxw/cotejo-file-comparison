import { describe, expect, it } from 'vitest'
import { DEFAULT_DIFF_OPTIONS, type DiffOptions } from '@shared/types'
import { computeDiff } from '@renderer/diff/align'

function withOptions(overrides: Partial<DiffOptions> = {}): DiffOptions {
  return { ...DEFAULT_DIFF_OPTIONS, ...overrides }
}

function diff(left: string, right: string, overrides: Partial<DiffOptions> = {}) {
  return computeDiff(left, right, withOptions(overrides))
}

/** Representacion compacta de la rejilla, util para afirmar la alineacion entera. */
function grid(left: string, right: string, overrides: Partial<DiffOptions> = {}): string[] {
  const leftLines = left === '' ? [] : left.split('\n')
  const rightLines = right === '' ? [] : right.split('\n')
  return diff(left, right, overrides).rows.map((row) => {
    const l = row.left === null ? '~' : leftLines[row.left]
    const r = row.right === null ? '~' : rightLines[row.right]
    return `${l} | ${r} | ${row.status}`
  })
}

describe('computeDiff', () => {
  it('marca todo como igual cuando los textos coinciden', () => {
    const result = diff('a\nb\nc', 'a\nb\nc')
    expect(result.rows).toHaveLength(3)
    expect(result.rows.every((row) => row.status === 'equal')).toBe(true)
    expect(result.blocks).toHaveLength(0)
  })

  it('cubre siempre todas las lineas de ambos documentos', () => {
    const left = 'a\nb\nc\nd'
    const right = 'a\nX\nd\ne'
    const result = diff(left, right)
    const leftSeen = result.rows.filter((r) => r.left !== null).map((r) => r.left)
    const rightSeen = result.rows.filter((r) => r.right !== null).map((r) => r.right)
    expect(leftSeen).toEqual([0, 1, 2, 3])
    expect(rightSeen).toEqual([0, 1, 2, 3])
  })

  it('enfrenta las lineas cambiadas en la misma fila', () => {
    expect(grid('a\nb\nc', 'a\nB\nc')).toEqual([
      'a | a | equal',
      'b | B | changed',
      'c | c | equal'
    ])
  })

  it('abre un hueco del lado que no tiene la linea', () => {
    expect(grid('a\nc', 'a\nb\nc')).toEqual([
      'a | a | equal',
      '~ | b | rightOnly',
      'c | c | equal'
    ])
  })

  it('empareja lo que puede y deja el sobrante como huerfano en el mismo bloque', () => {
    const result = diff('a\nX\nY\nZ\nb', 'a\nP\nb')
    expect(grid('a\nX\nY\nZ\nb', 'a\nP\nb')).toEqual([
      'a | a | equal',
      'X | P | changed',
      'Y | ~ | leftOnly',
      'Z | ~ | leftOnly',
      'b | b | equal'
    ])
    // Las tres filas distintas son un unico bloque de navegacion y de merge.
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0]).toMatchObject({ status: 'changed', startRow: 1, endRow: 4 })
  })

  it('resalta solo la palabra que cambio dentro de la linea', () => {
    const result = diff('const total = 10', 'const total = 42')
    const row = result.rows[0]
    expect(row?.status).toBe('changed')
    expect(row?.leftInline).toEqual([{ from: 14, to: 16 }])
    expect(row?.rightInline).toEqual([{ from: 14, to: 16 }])
  })

  it('no marca nada intra-linea cuando la fila es igual', () => {
    const result = diff('igual', 'igual')
    expect(result.rows[0]?.leftInline).toBeUndefined()
  })

  describe('alineacion de bloques reescritos', () => {
    it('mantiene las lineas enfrentadas aunque cambie la indentacion', () => {
      // Pasar a namespace con punto y coma reindenta el archivo entero y elimina
      // una llave. Sin emparejado por parecido, todo lo de debajo baja una fila.
      const left = ['namespace A', '{', '    class B', '    {', '    }', '}'].join('\n')
      const right = ['namespace A;', '', 'class B', '{', '}'].join('\n')

      expect(grid(left, right)).toEqual([
        'namespace A | namespace A; | changed',
        '{ |  | changed',
        '    class B | class B | changed',
        '    { | { | changed',
        '    } | ~ | leftOnly',
        '} | } | equal'
      ])
    })

    it('empareja por parecido y no por posicion', () => {
      expect(grid('total = uno + dos', 'const cabecera = 1\ntotal = uno + dos + tres')).toEqual([
        '~ | const cabecera = 1 | rightOnly',
        'total = uno + dos | total = uno + dos + tres | changed'
      ])
    })

    it('no parte un bloque por una llave que coincide en medio', () => {
      const result = diff('a1\n}\nb1', 'a2\n}\nb2')
      expect(result.blocks).toHaveLength(1)
      // La llave sigue siendo igual: entra en el bloque, pero no se pinta.
      expect(result.rows.map((row) => row.status)).toEqual(['changed', 'equal', 'changed'])
    })

    it('respeta las igualdades con contenido: siguen separando bloques', () => {
      expect(diff('a1\nsame\nb1', 'a2\nsame\nb2').blocks).toHaveLength(2)
    })

    it('deja huerfanas las lineas que no se parecen a nada', () => {
      expect(grid('uno\ndos\ntres', 'uno\nX\nY\ntres')).toEqual([
        'uno | uno | equal',
        'dos | X | changed',
        '~ | Y | rightOnly',
        'tres | tres | equal'
      ])
    })
  })

  describe('opciones de comparacion', () => {
    it('ignoreWhitespace convierte la diferencia en `ignored`, no en `equal`', () => {
      const strict = diff('a  =  1', 'a = 1')
      expect(strict.rows[0]?.status).toBe('changed')

      const relaxed = diff('a  =  1', 'a = 1', { ignoreWhitespace: true })
      expect(relaxed.rows[0]?.status).toBe('ignored')
      expect(relaxed.blocks).toHaveLength(0)
    })

    it('ignoreCase ignora las diferencias de mayusculas', () => {
      expect(diff('Hola', 'HOLA').rows[0]?.status).toBe('changed')
      expect(diff('Hola', 'HOLA', { ignoreCase: true }).rows[0]?.status).toBe('ignored')
    })

    it('ignoreBlankLines no pierde las lineas en blanco del documento', () => {
      const left = 'a\n\n\nb'
      const right = 'a\nb'
      const result = diff(left, right, { ignoreBlankLines: true })

      expect(result.blocks).toHaveLength(0)
      expect(result.rows.filter((r) => r.left !== null).map((r) => r.left)).toEqual([0, 1, 2, 3])
      expect(result.rows.filter((r) => r.right !== null).map((r) => r.right)).toEqual([0, 1])
    })

    it('sin ignoreBlankLines las lineas en blanco son diferencias reales', () => {
      const result = diff('a\n\nb', 'a\nb')
      expect(result.blocks).toHaveLength(1)
    })

    it('trata el tabulador y su equivalente en espacios segun tabSize', () => {
      expect(diff('\tx', '    x', { tabSize: 4 }).rows[0]?.status).toBe('ignored')
      expect(diff('\tx', '    x', { tabSize: 8 }).rows[0]?.status).toBe('changed')
    })
  })

  describe('casos limite', () => {
    it('maneja dos documentos vacios', () => {
      const result = diff('', '')
      expect(result.rows).toHaveLength(0)
      expect(result.blocks).toHaveLength(0)
    })

    it('maneja un documento vacio contra otro con contenido', () => {
      const result = diff('', 'a\nb')
      expect(result.rows.map((r) => r.status)).toEqual(['rightOnly', 'rightOnly'])
      expect(result.blocks).toHaveLength(1)
    })

    it('distingue un archivo que termina sin salto de linea', () => {
      // "a\nb\n" son tres lineas (la ultima vacia); "a\nb" son dos.
      const result = diff('a\nb\n', 'a\nb')
      expect(result.rows).toHaveLength(3)
      expect(result.rows[2]?.status).toBe('leftOnly')
    })

    it('cuenta las estadisticas por fila', () => {
      const result = diff('a\nb\nc', 'a\nB\nc\nd')
      expect(result.stats).toEqual({ equal: 2, changed: 1, leftOnly: 0, rightOnly: 1, ignored: 0 })
    })

    it('numera los bloques de forma consecutiva', () => {
      const result = diff('a\nX\nb\nY\nc', 'a\nP\nb\nQ\nc')
      expect(result.blocks.map((block) => block.index)).toEqual([0, 1])
      for (const block of result.blocks) {
        for (let row = block.startRow; row < block.endRow; row++) {
          expect(result.rows[row]?.block).toBe(block.index)
        }
      }
    })

    it('omite el diff intra-linea en documentos enormes', () => {
      const big = Array.from({ length: 120_000 }, (_, i) => `linea ${i}`).join('\n')
      const other = big.replace('linea 5\n', 'LINEA 5\n')
      const result = computeDiff(big, other, DEFAULT_DIFF_OPTIONS)
      expect(result.inlineSkipped).toBe(true)
      expect(result.rows.some((row) => row.leftInline !== undefined)).toBe(false)
    })
  })
})
