import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { availableParallelism } from 'node:os'

/**
 * Hash sha256 en streaming: nunca carga el archivo entero en memoria, asi que
 * comparar dos ISOs de 4 GB cuesta lo mismo en RAM que comparar dos .txt.
 */
export function hashFile(fullPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(fullPath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * Ejecuta `worker` sobre cada elemento con como mucho `limit` tareas en vuelo.
 *
 * El hashing esta limitado por el disco, no por la CPU: lanzar mil lecturas a
 * la vez satura la cola de E/S y lo hace mas lento, no mas rapido.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  limit = Math.max(2, Math.min(8, availableParallelism()))
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  async function runner(): Promise<void> {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await worker(items[index] as T, index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner))
  return results
}
