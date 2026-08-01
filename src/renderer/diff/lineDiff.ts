/**
 * Diff por lineas.
 *
 * Estrategia en tres capas, de mas barata a mas cara:
 *   1. Recortar el prefijo y el sufijo comunes. En el caso habitual (un cambio
 *      pequeno dentro de un archivo grande) esto reduce el problema a casi nada.
 *   2. Anclar en lineas que aparecen exactamente una vez en cada lado (patience
 *      diff) y recursar entre anclas. Da alineaciones legibles y trocea el
 *      problema en regiones pequenas.
 *   3. Myers O(ND) dentro de cada region. Es optimo, pero su traza cuesta
 *      memoria proporcional a D, asi que solo se le entregan regiones acotadas.
 */

export type OpType = 'equal' | 'delete' | 'insert'

/** Rangos semiabiertos [start, end). En `delete` el rango b es vacio, y viceversa. */
export interface DiffOp {
  type: OpType
  aStart: number
  aEnd: number
  bStart: number
  bEnd: number
}

/** Por encima de esto, Myers cede el paso a un bloque de reemplazo directo. */
const MYERS_MAX_REGION = 4000
const TRACE_BUDGET_BYTES = 48 * 1024 * 1024

class OpBuilder {
  readonly ops: DiffOp[] = []

  push(type: OpType, aStart: number, aEnd: number, bStart: number, bEnd: number): void {
    if (aStart === aEnd && bStart === bEnd) return
    const last = this.ops[this.ops.length - 1]
    if (last && last.type === type && last.aEnd === aStart && last.bEnd === bStart) {
      last.aEnd = aEnd
      last.bEnd = bEnd
      return
    }
    this.ops.push({ type, aStart, aEnd, bStart, bEnd })
  }
}

/** Convierte las lineas en enteros para que comparar sea un `===` sobre numeros. */
function intern(a: string[], b: string[]): { a: Int32Array; b: Int32Array } {
  const ids = new Map<string, number>()
  const toId = (line: string): number => {
    let id = ids.get(line)
    if (id === undefined) {
      id = ids.size
      ids.set(line, id)
    }
    return id
  }
  const ia = new Int32Array(a.length)
  const ib = new Int32Array(b.length)
  for (let i = 0; i < a.length; i++) ia[i] = toId(a[i] as string)
  for (let i = 0; i < b.length; i++) ib[i] = toId(b[i] as string)
  return { a: ia, b: ib }
}

/**
 * Myers O(ND) con traza completa. Devuelve null si la traza excede el
 * presupuesto de memoria, para que el llamante degrade en vez de reventar.
 */
function greedyMyers(
  a: Int32Array,
  a0: number,
  n: number,
  b: Int32Array,
  b0: number,
  m: number,
  out: OpBuilder
): boolean {
  const max = n + m
  const size = 2 * max + 1
  const maxRounds = Math.min(max, Math.floor(TRACE_BUDGET_BYTES / (size * 4)))
  const off = max
  const v = new Int32Array(size)
  const trace: Int32Array[] = []

  for (let d = 0; d <= maxRounds; d++) {
    trace.push(v.slice())

    for (let k = -d; k <= d; k += 2) {
      let x: number
      if (k === -d || (k !== d && (v[off + k - 1] as number) < (v[off + k + 1] as number))) {
        x = v[off + k + 1] as number
      } else {
        x = (v[off + k - 1] as number) + 1
      }
      let y = x - k

      while (x < n && y < m && a[a0 + x] === b[b0 + y]) {
        x++
        y++
      }
      v[off + k] = x

      if (x >= n && y >= m) {
        backtrack(trace, d, n, m, off, a0, b0, out)
        return true
      }
    }
  }

  return false
}

/**
 * Reconstruye el camino desde (n, m) hasta (0, 0) usando las instantaneas de V.
 * `trace[d]` es el estado de V *antes* de la ronda d, que es justo lo que la
 * ronda d leyo para decidir su movimiento.
 */
function backtrack(
  trace: Int32Array[],
  d: number,
  n: number,
  m: number,
  off: number,
  a0: number,
  b0: number,
  out: OpBuilder
): void {
  type Step = { type: OpType; aStart: number; aEnd: number; bStart: number; bEnd: number }
  const steps: Step[] = []

  let x = n
  let y = m

  for (let round = d; round > 0; round--) {
    const v = trace[round] as Int32Array
    const k = x - y

    let prevK: number
    if (k === -round || (k !== round && (v[off + k - 1] as number) < (v[off + k + 1] as number))) {
      prevK = k + 1
    } else {
      prevK = k - 1
    }
    const prevX = v[off + prevK] as number
    const prevY = prevX - prevK

    // Primero la diagonal (lineas iguales), que es lo ultimo que hizo la ronda.
    if (x > prevX && y > prevY) {
      const count = Math.min(x - prevX, y - prevY)
      steps.push({
        type: 'equal',
        aStart: a0 + x - count,
        aEnd: a0 + x,
        bStart: b0 + y - count,
        bEnd: b0 + y
      })
      x -= count
      y -= count
    }

    if (x > prevX) {
      steps.push({ type: 'delete', aStart: a0 + x - 1, aEnd: a0 + x, bStart: b0 + y, bEnd: b0 + y })
      x--
    } else if (y > prevY) {
      steps.push({ type: 'insert', aStart: a0 + x, aEnd: a0 + x, bStart: b0 + y - 1, bEnd: b0 + y })
      y--
    }
  }

  if (x > 0) {
    steps.push({ type: 'equal', aStart: a0, aEnd: a0 + x, bStart: b0, bEnd: b0 + y })
  }

  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i] as Step
    out.push(step.type, step.aStart, step.aEnd, step.bStart, step.bEnd)
  }
}

/**
 * Lineas que aparecen exactamente una vez en A y exactamente una vez en B.
 * Son anclas fiables: si una linea unica coincide, casi con certeza es "la
 * misma" linea en los dos documentos.
 */
function uniqueMatches(
  a: Int32Array,
  a0: number,
  n: number,
  b: Int32Array,
  b0: number,
  m: number
): { ai: number; bi: number }[] {
  const countA = new Map<number, number>()
  const countB = new Map<number, number>()
  const posA = new Map<number, number>()
  const posB = new Map<number, number>()

  for (let i = 0; i < n; i++) {
    const id = a[a0 + i] as number
    countA.set(id, (countA.get(id) ?? 0) + 1)
    posA.set(id, i)
  }
  for (let i = 0; i < m; i++) {
    const id = b[b0 + i] as number
    countB.set(id, (countB.get(id) ?? 0) + 1)
    posB.set(id, i)
  }

  const matches: { ai: number; bi: number }[] = []
  for (const [id, count] of countA) {
    if (count !== 1 || countB.get(id) !== 1) continue
    matches.push({ ai: posA.get(id) as number, bi: posB.get(id) as number })
  }
  matches.sort((x, y) => x.ai - y.ai)
  return matches
}

/** Subsecuencia creciente mas larga por `bi`, via patience sorting. */
function longestIncreasing(matches: { ai: number; bi: number }[]): { ai: number; bi: number }[] {
  if (matches.length === 0) return []

  const tails: number[] = [] // indices en `matches` del final de cada pila
  const parent = new Int32Array(matches.length).fill(-1)

  for (let i = 0; i < matches.length; i++) {
    const bi = (matches[i] as { bi: number }).bi
    let low = 0
    let high = tails.length
    while (low < high) {
      const mid = (low + high) >> 1
      if ((matches[tails[mid] as number] as { bi: number }).bi < bi) low = mid + 1
      else high = mid
    }
    if (low > 0) parent[i] = tails[low - 1] as number
    tails[low] = i
  }

  const result: { ai: number; bi: number }[] = []
  let cursor = tails[tails.length - 1] as number
  while (cursor !== -1) {
    result.push(matches[cursor] as { ai: number; bi: number })
    cursor = parent[cursor] as number
  }
  return result.reverse()
}

function diffRegion(
  a: Int32Array,
  a0: number,
  n: number,
  b: Int32Array,
  b0: number,
  m: number,
  out: OpBuilder
): void {
  if (n === 0 && m === 0) return
  if (n === 0) {
    out.push('insert', a0, a0, b0, b0 + m)
    return
  }
  if (m === 0) {
    out.push('delete', a0, a0 + n, b0, b0)
    return
  }

  if (n + m <= MYERS_MAX_REGION) {
    if (greedyMyers(a, a0, n, b, b0, m, out)) return
  }

  const anchors = longestIncreasing(uniqueMatches(a, a0, n, b, b0, m))

  if (anchors.length === 0) {
    // Sin anclas y demasiado grande para Myers: un bloque de reemplazo limpio.
    if (greedyMyers(a, a0, n, b, b0, m, out)) return
    out.push('delete', a0, a0 + n, b0, b0)
    out.push('insert', a0 + n, a0 + n, b0, b0 + m)
    return
  }

  let ai = 0
  let bi = 0
  for (const anchor of anchors) {
    diffRegion(a, a0 + ai, anchor.ai - ai, b, b0 + bi, anchor.bi - bi, out)
    out.push('equal', a0 + anchor.ai, a0 + anchor.ai + 1, b0 + anchor.bi, b0 + anchor.bi + 1)
    ai = anchor.ai + 1
    bi = anchor.bi + 1
  }
  diffRegion(a, a0 + ai, n - ai, b, b0 + bi, m - bi, out)
}

/**
 * Compara dos secuencias de claves de linea y devuelve las operaciones de
 * edicion agrupadas en tramos contiguos.
 */
export function diffLineKeys(aKeys: string[], bKeys: string[]): DiffOp[] {
  const { a, b } = intern(aKeys, bKeys)
  const out = new OpBuilder()

  const total = Math.min(a.length, b.length)

  let prefix = 0
  while (prefix < total && a[prefix] === b[prefix]) prefix++

  let suffix = 0
  while (
    suffix < total - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix++
  }

  out.push('equal', 0, prefix, 0, prefix)
  diffRegion(
    a,
    prefix,
    a.length - suffix - prefix,
    b,
    prefix,
    b.length - suffix - prefix,
    out
  )
  out.push('equal', a.length - suffix, a.length, b.length - suffix, b.length)

  return out.ops
}
