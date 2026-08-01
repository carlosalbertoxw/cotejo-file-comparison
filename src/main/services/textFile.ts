import { readFile, writeFile, stat } from 'node:fs/promises'
import type { Eol, TextFilePayload } from '@shared/types'
import { ipcError } from '@shared/ipc-errors'

/** Umbral por encima del cual nos negamos a cargar el archivo en un panel. */
export const MAX_TEXT_BYTES = 64 * 1024 * 1024

const BOM = '﻿'

/**
 * Heuristica estandar: un byte nulo en la cabecera significa binario.
 * Evita que abrir un .exe en el editor cuelgue la interfaz.
 */
export function looksBinary(buffer: Buffer): boolean {
  const limit = Math.min(buffer.length, 8192)
  for (let i = 0; i < limit; i++) {
    if (buffer[i] === 0) return true
  }
  return false
}

export function detectEol(text: string): Eol {
  let crlf = 0
  let lf = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '\n') continue
    if (i > 0 && text[i - 1] === '\r') crlf++
    else lf++
  }
  if (crlf > 0 && lf > 0) return 'mixed'
  if (crlf > 0) return 'crlf'
  return 'lf'
}

/**
 * Convierte el contenido crudo del disco a lo que ve el renderer: siempre LF,
 * sin BOM. `eol` y `encoding` guardan la forma original para poder devolverla
 * intacta al guardar.
 */
export function decodeText(buffer: Buffer): Omit<TextFilePayload, 'path' | 'size' | 'mtimeMs'> {
  let text = buffer.toString('utf8')
  const encoding = text.startsWith(BOM) ? 'utf8-bom' : 'utf8'
  if (encoding === 'utf8-bom') text = text.slice(1)

  return { content: text.replace(/\r\n/g, '\n'), eol: detectEol(text), encoding }
}

/** Reconstruye el archivo tal y como estaba escrito antes de editarlo. */
export function encodeText(content: string, eol: Eol, encoding: 'utf8' | 'utf8-bom'): string {
  // `mixed` se guarda como LF: no hay forma de reconstruir la mezcla original.
  const withEol = eol === 'crlf' ? content.replace(/\n/g, '\r\n') : content
  return encoding === 'utf8-bom' ? BOM + withEol : withEol
}

export async function readTextFile(path: string): Promise<TextFilePayload> {
  const info = await stat(path)
  if (info.isDirectory()) throw ipcError('notAFile', { path })
  if (info.size > MAX_TEXT_BYTES) {
    throw ipcError('fileTooLarge', {
      size: (info.size / 1024 / 1024).toFixed(1),
      limit: MAX_TEXT_BYTES / 1024 / 1024
    })
  }

  const buffer = await readFile(path)
  if (looksBinary(buffer)) {
    throw ipcError('binaryFile', { path })
  }

  return { path, ...decodeText(buffer), size: info.size, mtimeMs: info.mtimeMs }
}

export async function writeTextFile(
  path: string,
  content: string,
  eol: Eol,
  encoding: 'utf8' | 'utf8-bom'
): Promise<{ mtimeMs: number; size: number }> {
  await writeFile(path, encodeText(content, eol, encoding), 'utf8')
  const info = await stat(path)
  return { mtimeMs: info.mtimeMs, size: info.size }
}
