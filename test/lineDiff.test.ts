import { describe, expect, it } from 'vitest'
import { diffLineKeys, type DiffOp } from '@renderer/diff/lineDiff'

/**
 * Reconstruye A y B a partir de las operaciones. Si el diff es correcto, las
 * dos reconstrucciones tienen que coincidir con las entradas originales, y los
 * rangos tienen que cubrir ambos documentos sin huecos ni solapes.
 */
function applyOps(ops: DiffOp[], a: string[], b: string[]): { a: string[]; b: string[] } {
  const outA: string[] = []
  const outB: string[] = []
  let cursorA = 0
  let cursorB = 0

  for (const op of ops) {
    expect(op.aStart, `hueco/solape en A antes de ${JSON.stringify(op)}`).toBe(cursorA)
    expect(op.bStart, `hueco/solape en B antes de ${JSON.stringify(op)}`).toBe(cursorB)

    if (op.type === 'equal') {
      expect(op.aEnd - op.aStart).toBe(op.bEnd - op.bStart)
      for (let i = op.aStart; i < op.aEnd; i++) {
        expect(a[i]).toBe(b[op.bStart + (i - op.aStart)])
        outA.push(a[i] as string)
        outB.push(b[op.bStart + (i - op.aStart)] as string)
      }
    } else if (op.type === 'delete') {
      expect(op.bEnd).toBe(op.bStart)
      for (let i = op.aStart; i < op.aEnd; i++) outA.push(a[i] as string)
    } else {
      expect(op.aEnd).toBe(op.aStart)
      for (let i = op.bStart; i < op.bEnd; i++) outB.push(b[i] as string)
    }

    cursorA = op.aEnd
    cursorB = op.bEnd
  }

  expect(cursorA, 'las ops no cubren todo A').toBe(a.length)
  expect(cursorB, 'las ops no cubren todo B').toBe(b.length)
  return { a: outA, b: outB }
}

function check(a: string[], b: string[]): DiffOp[] {
  const ops = diffLineKeys(a, b)
  const rebuilt = applyOps(ops, a, b)
  expect(rebuilt.a).toEqual(a)
  expect(rebuilt.b).toEqual(b)
  return ops
}

/** Numero de lineas que el diff considera iguales. Sirve para medir calidad. */
function equalCount(ops: DiffOp[]): number {
  return ops.reduce((sum, op) => (op.type === 'equal' ? sum + (op.aEnd - op.aStart) : sum), 0)
}

/** LCS por programacion dinamica: la referencia contra la que medir optimalidad. */
function lcsLength(a: string[], b: string[]): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const table = new Int32Array(rows * cols)
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      table[i * cols + j] =
        a[i - 1] === b[j - 1]
          ? (table[(i - 1) * cols + (j - 1)] as number) + 1
          : Math.max(table[(i - 1) * cols + j] as number, table[i * cols + (j - 1)] as number)
    }
  }
  return table[rows * cols - 1] as number
}

describe('diffLineKeys', () => {
  it('marca dos documentos identicos como un unico tramo igual', () => {
    const lines = ['a', 'b', 'c']
    const ops = check(lines, [...lines])
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ type: 'equal', aStart: 0, aEnd: 3, bStart: 0, bEnd: 3 })
  })

  it('trata dos documentos vacios como sin operaciones', () => {
    expect(diffLineKeys([], [])).toEqual([])
  })

  it('convierte un documento vacio en una insercion completa', () => {
    const ops = check([], ['a', 'b'])
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ type: 'insert', bStart: 0, bEnd: 2 })
  })

  it('convierte el otro lado vacio en un borrado completo', () => {
    const ops = check(['a', 'b'], [])
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ type: 'delete', aStart: 0, aEnd: 2 })
  })

  it('detecta una insercion en el medio', () => {
    const ops = check(['a', 'b', 'c'], ['a', 'x', 'b', 'c'])
    expect(ops.filter((op) => op.type === 'insert')).toHaveLength(1)
    expect(ops.filter((op) => op.type === 'delete')).toHaveLength(0)
    expect(equalCount(ops)).toBe(3)
  })

  it('detecta un borrado en el medio', () => {
    const ops = check(['a', 'b', 'c'], ['a', 'c'])
    expect(ops.filter((op) => op.type === 'delete')).toHaveLength(1)
    expect(ops.filter((op) => op.type === 'insert')).toHaveLength(0)
    expect(equalCount(ops)).toBe(2)
  })

  it('representa una linea cambiada como borrado + insercion adyacentes', () => {
    const ops = check(['a', 'b', 'c'], ['a', 'B', 'c'])
    expect(equalCount(ops)).toBe(2)
    const kinds = ops.map((op) => op.type)
    expect(kinds).toContain('delete')
    expect(kinds).toContain('insert')
  })

  it('no encuentra nada en comun entre documentos disjuntos', () => {
    const ops = check(['a', 'b'], ['x', 'y'])
    expect(equalCount(ops)).toBe(0)
  })

  it('alinea correctamente cuando hay lineas repetidas', () => {
    const a = ['x', 'x', 'x', 'a', 'x', 'x']
    const b = ['x', 'x', 'a', 'x', 'x', 'x']
    const ops = check(a, b)
    expect(equalCount(ops)).toBe(lcsLength(a, b))
  })

  it('es optimo (LCS) en el caso clasico de Myers', () => {
    const a = 'ABCABBA'.split('')
    const b = 'CBABAC'.split('')
    const ops = check(a, b)
    expect(equalCount(ops)).toBe(lcsLength(a, b))
  })

  it('produce un diff valido y optimo en 300 casos aleatorios', () => {
    let seed = 12345
    const random = (): number => {
      // LCG determinista: si un caso falla, se puede reproducir.
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    const alphabet = 'abcdefg'

    for (let round = 0; round < 300; round++) {
      const makeDoc = (): string[] =>
        Array.from({ length: Math.floor(random() * 25) }, () =>
          alphabet[Math.floor(random() * alphabet.length)] as string
        )
      const a = makeDoc()
      const b = makeDoc()
      const ops = check(a, b)
      expect(equalCount(ops), `ronda ${round}: ${a.join('')} vs ${b.join('')}`).toBe(
        lcsLength(a, b)
      )
    }
  })

  it('recorta prefijo y sufijo comunes en archivos grandes', () => {
    const big = Array.from({ length: 20000 }, (_, i) => `linea ${i}`)
    const modified = [...big]
    modified[10000] = 'CAMBIADA'
    const ops = check(big, modified)
    expect(equalCount(ops)).toBe(19999)
  })

  it('sobrevive a dos documentos grandes y completamente distintos', () => {
    const a = Array.from({ length: 6000 }, (_, i) => `izquierda ${i}`)
    const b = Array.from({ length: 6000 }, (_, i) => `derecha ${i}`)
    const ops = check(a, b)
    expect(equalCount(ops)).toBe(0)
  })
})
