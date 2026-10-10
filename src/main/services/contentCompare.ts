import { open, type FileHandle } from 'node:fs/promises'
import { availableParallelism } from 'node:os'

/**
 * Lo que se lee de cada archivo en cada vuelta. Acota la memoria —dos bloques
 * por par en vuelo— y cada cuanto se atiende una cancelacion.
 */
export const CHUNK_BYTES = 256 * 1024

/** La comparacion se paro porque el usuario la cancelo, no porque fallara. */
export class ComparisonCancelled extends Error {
  constructor() {
    super('Comparacion cancelada')
    this.name = 'ComparisonCancelled'
  }
}

/**
 * Llena `buffer` desde `position` salvo que el archivo se acabe antes.
 *
 * Un `read` puede devolver menos de lo pedido sin haber llegado al final —en
 * una unidad de red, por ejemplo—, y comparar dos lecturas cortas de distinto
 * tamano daria por distintos dos archivos iguales.
 */
async function readFull(handle: FileHandle, buffer: Buffer, position: number): Promise<number> {
  let filled = 0
  while (filled < buffer.length) {
    const remaining = buffer.length - filled
    const { bytesRead } = await handle.read(buffer, filled, remaining, position + filled)
    if (bytesRead === 0) break
    filled += bytesRead
  }
  return filled
}

/**
 * Si dos archivos tienen exactamente el mismo contenido.
 *
 * Se leen a la par, bloque a bloque, y se para en la primera diferencia. Antes
 * se calculaba el sha256 de los dos enteros: dos imagenes de 4 GB distintas
 * desde el primer byte se leian completas, y cancelar no surtia efecto hasta
 * terminar el par. Aqui se consulta `isCancelled` antes de cada bloque, y
 * cancelar a medias lanza `ComparisonCancelled`.
 *
 * No hace falta resumen: el resultado es igual o distinto, y comparar bytes no
 * tiene colisiones.
 */
export async function sameContent(
  leftPath: string,
  rightPath: string,
  isCancelled: () => boolean = () => false
): Promise<boolean> {
  // Si uno de los dos no abre, el otro se cierra igual.
  const opened = await Promise.allSettled([open(leftPath, 'r'), open(rightPath, 'r')])
  const handles = opened.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  try {
    for (const result of opened) {
      if (result.status === 'rejected') throw result.reason
    }
    const [left, right] = handles as [FileHandle, FileHandle]
    const leftChunk = Buffer.allocUnsafe(CHUNK_BYTES)
    const rightChunk = Buffer.allocUnsafe(CHUNK_BYTES)

    for (let position = 0; ; position += CHUNK_BYTES) {
      if (isCancelled()) throw new ComparisonCancelled()
      const [leftRead, rightRead] = await Promise.all([
        readFull(left, leftChunk, position),
        readFull(right, rightChunk, position)
      ])
      if (leftRead !== rightRead) return false
      if (leftRead === 0) return true
      if (!leftChunk.subarray(0, leftRead).equals(rightChunk.subarray(0, rightRead))) return false
      if (leftRead < CHUNK_BYTES) return true
    }
  } finally {
    await Promise.all(handles.map((handle) => handle.close().catch(() => undefined)))
  }
}

/**
 * Ejecuta `worker` sobre cada elemento con como mucho `limit` tareas en vuelo.
 *
 * Leer contenido esta limitado por el disco, no por la CPU: lanzar mil
 * lecturas a la vez satura la cola de E/S y lo hace mas lento, no mas rapido.
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
