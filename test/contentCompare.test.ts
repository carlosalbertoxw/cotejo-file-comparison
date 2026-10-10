import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CHUNK_BYTES,
  ComparisonCancelled,
  sameContent
} from '../src/main/services/contentCompare'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cotejo-content-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function pair(left: Buffer, right: Buffer): Promise<[string, string]> {
  const leftPath = join(root, 'izquierda.bin')
  const rightPath = join(root, 'derecha.bin')
  await writeFile(leftPath, left)
  await writeFile(rightPath, right)
  return [leftPath, rightPath]
}

/** Contenido de varios bloques que no se repite de un bloque a otro. */
function bytes(length: number): Buffer {
  const buffer = Buffer.alloc(length)
  for (let i = 0; i < length; i++) buffer[i] = (i * 31 + (i >> 8)) & 0xff
  return buffer
}

describe('sameContent', () => {
  it('da por iguales dos archivos identicos de varios bloques', async () => {
    const content = bytes(CHUNK_BYTES * 2 + 123)
    expect(await sameContent(...(await pair(content, Buffer.from(content))))).toBe(true)
  })

  it('da por iguales dos archivos que miden justo un bloque', async () => {
    const content = bytes(CHUNK_BYTES)
    expect(await sameContent(...(await pair(content, Buffer.from(content))))).toBe(true)
  })

  it('ve una diferencia en el primer byte', async () => {
    const left = bytes(CHUNK_BYTES * 3)
    const right = Buffer.from(left)
    right[0] = (right[0] as number) ^ 1
    expect(await sameContent(...(await pair(left, right)))).toBe(false)
  })

  it('ve una diferencia en el ultimo byte del ultimo bloque', async () => {
    const left = bytes(CHUNK_BYTES * 2 + 7)
    const right = Buffer.from(left)
    right[right.length - 1] = (right[right.length - 1] as number) ^ 1
    expect(await sameContent(...(await pair(left, right)))).toBe(false)
  })

  it('distingue un archivo de otro que lo contiene y sigue', async () => {
    const left = bytes(CHUNK_BYTES + 10)
    const right = Buffer.concat([left, Buffer.from('mas')])
    expect(await sameContent(...(await pair(left, right)))).toBe(false)
  })

  it('para en cuanto se cancela, aunque el par no haya terminado', async () => {
    const content = bytes(CHUNK_BYTES * 4)
    const [left, right] = await pair(content, Buffer.from(content))
    let checks = 0
    // Deja leer el primer bloque y cancela antes del segundo.
    const isCancelled = (): boolean => ++checks > 1
    await expect(sameContent(left, right, isCancelled)).rejects.toBeInstanceOf(ComparisonCancelled)
    expect(checks).toBe(2)
  })

  it('falla si uno de los dos no existe', async () => {
    const [left] = await pair(Buffer.from('a'), Buffer.from('a'))
    await expect(sameContent(left, join(root, 'no-existe.bin'))).rejects.toMatchObject({
      code: 'ENOENT'
    })
  })
})
