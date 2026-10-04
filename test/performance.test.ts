/**
 * Presupuestos de rendimiento.
 *
 * La fusion de arboles y el diff tienen que crecer mas o menos en linea recta
 * con la entrada (ver los comentarios de `compareTree.ts`), pero nada impedia
 * que un cambio los volviera cuadraticos: las pruebas de siempre usan arboles
 * de diez archivos, y ahi O(n) y O(n²) tardan lo mismo. Estas no miden la
 * velocidad: comprueban que el tamano de diseno cabe con mucha holgura.
 *
 * Los topes son mas de diez veces lo que se tarda hoy en un portatil normal,
 * para que un runner lento del CI no los dispare. Una regresion cuadratica no
 * cabe: con 50 000 entradas son miles de millones de pasos.
 *
 * Los objetivos estan en el README (Desarrollo → Rendimiento).
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_DIFF_OPTIONS, type EntryStat } from '@shared/types'
import { computeDiff } from '@renderer/diff/align'
import { compareTrees } from '../src/main/services/compareTree'

async function timed<T>(run: () => Promise<T> | T): Promise<number> {
  const start = performance.now()
  await run()
  return performance.now() - start
}

const dirStat: EntryStat = { size: 0, mtimeMs: 0, isDir: true }

/** Dos indices como los del escaneo: 100 × 10 carpetas y `files` archivos. */
function indexes(files: number): [Map<string, EntryStat>, Map<string, EntryStat>] {
  const left = new Map<string, EntryStat>()
  const right = new Map<string, EntryStat>()
  for (let d = 0; d < 100; d++) {
    for (const index of [left, right]) index.set(`d${d}`, dirStat)
    for (let s = 0; s < 10; s++) {
      for (const index of [left, right]) index.set(`d${d}/s${s}`, dirStat)
    }
  }
  for (let i = 0; i < files; i++) {
    const relPath = `d${i % 100}/s${i % 10}/f${i}.txt`
    left.set(relPath, { size: i, mtimeMs: 1000, isDir: false })
    // Uno de cada diez solo a la izquierda y uno de cada siete distinto.
    if (i % 10 !== 0) {
      right.set(relPath, { size: i + (i % 7 === 0 ? 1 : 0), mtimeMs: 1000, isDir: false })
    }
  }
  return [left, right]
}

describe('presupuestos de rendimiento', () => {
  it('fusiona dos arboles de 50 000 archivos en menos de 10 s', async () => {
    const [left, right] = indexes(50_000)
    let leftOnly = 0
    const elapsed = await timed(async () => {
      const result = await compareTrees('/a', '/b', left, right, 'quick')
      leftOnly = result.stats.leftOnly
    })
    expect(leftOnly).toBe(5_000)
    expect(elapsed).toBeLessThan(10_000)
  }, 30_000)

  it('compara dos textos de 50 000 lineas en menos de 5 s', async () => {
    const left = Array.from({ length: 50_000 }, (_, i) => `linea ${i} con algo de texto ${i * 7}`)
    const right = left
      .map((line, i) => (i % 50 === 0 ? `${line} cambiada` : line))
      .filter((_, i) => i % 333 !== 0)
    let rows = 0
    const elapsed = await timed(() => {
      rows = computeDiff(left.join('\n'), right.join('\n'), DEFAULT_DIFF_OPTIONS).rows.length
    })
    expect(rows).toBeGreaterThanOrEqual(50_000)
    expect(elapsed).toBeLessThan(5_000)
  }, 30_000)
})
