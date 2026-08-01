import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  decodeText,
  detectEol,
  encodeText,
  looksBinary,
  readTextFile,
  writeTextFile
} from '../src/main/services/textFile'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cotejo-text-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('detectEol', () => {
  it('reconoce LF, CRLF y mezcla', () => {
    expect(detectEol('a\nb\n')).toBe('lf')
    expect(detectEol('a\r\nb\r\n')).toBe('crlf')
    expect(detectEol('a\r\nb\n')).toBe('mixed')
  })

  it('trata un archivo sin saltos de linea como LF', () => {
    expect(detectEol('una sola linea')).toBe('lf')
  })
})

describe('looksBinary', () => {
  it('detecta un byte nulo', () => {
    expect(looksBinary(Buffer.from([0x4d, 0x5a, 0x00, 0x01]))).toBe(true)
  })

  it('acepta texto normal, incluidos acentos y emojis', () => {
    expect(looksBinary(Buffer.from('función año 🚀', 'utf8'))).toBe(false)
  })
})

describe('decodeText / encodeText', () => {
  it('normaliza CRLF a LF al leer y lo restaura al escribir', () => {
    const decoded = decodeText(Buffer.from('a\r\nb\r\n', 'utf8'))
    expect(decoded.content).toBe('a\nb\n')
    expect(decoded.eol).toBe('crlf')
    expect(encodeText(decoded.content, decoded.eol, decoded.encoding)).toBe('a\r\nb\r\n')
  })

  it('quita el BOM al leer y lo vuelve a poner al escribir', () => {
    const decoded = decodeText(Buffer.from('﻿hola\n', 'utf8'))
    expect(decoded.content).toBe('hola\n')
    expect(decoded.encoding).toBe('utf8-bom')
    expect(encodeText(decoded.content, decoded.eol, decoded.encoding)).toBe('﻿hola\n')
  })

  it('deja intacto un archivo LF sin BOM', () => {
    const original = 'a\nb\n'
    const decoded = decodeText(Buffer.from(original, 'utf8'))
    expect(encodeText(decoded.content, decoded.eol, decoded.encoding)).toBe(original)
  })
})

describe('lectura y escritura sobre disco', () => {
  it('conserva los finales de linea CRLF despues de editar y guardar', async () => {
    const path = join(dir, 'crlf.txt')
    await writeFile(path, 'uno\r\ndos\r\ntres\r\n', 'utf8')

    const payload = await readTextFile(path)
    expect(payload.content).toBe('uno\ndos\ntres\n')
    expect(payload.eol).toBe('crlf')

    // El renderer edita en LF, como siempre.
    const edited = payload.content.replace('dos', 'DOS')
    await writeTextFile(path, edited, payload.eol, payload.encoding)

    expect(await readFile(path, 'utf8')).toBe('uno\r\nDOS\r\ntres\r\n')
  })

  it('conserva el BOM despues de editar y guardar', async () => {
    const path = join(dir, 'bom.txt')
    await writeFile(path, '﻿hola\nmundo\n', 'utf8')

    const payload = await readTextFile(path)
    await writeTextFile(path, `${payload.content}fin\n`, payload.eol, payload.encoding)

    expect(await readFile(path, 'utf8')).toBe('﻿hola\nmundo\nfin\n')
  })

  it('rechaza un archivo binario con un mensaje claro', async () => {
    const path = join(dir, 'binario.bin')
    await writeFile(path, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]))
    await expect(readTextFile(path)).rejects.toThrow(/binario/i)
  })

  it('rechaza una carpeta', async () => {
    await expect(readTextFile(dir)).rejects.toThrow(/carpeta/i)
  })

  it('devuelve tamaño y fecha junto al contenido', async () => {
    const path = join(dir, 'a.txt')
    await writeFile(path, 'hola', 'utf8')
    const payload = await readTextFile(path)
    expect(payload.size).toBe(4)
    expect(payload.mtimeMs).toBeGreaterThan(0)
    expect(payload.path).toBe(path)
  })
})
