import { readFile, writeFile, rename, stat, lstat, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Eol, TextFilePayload } from '@shared/types'
import { ipcError } from '@shared/ipc-errors'

/**
 * Umbral por encima del cual nos negamos a cargar el archivo en un panel.
 *
 * Antes eran 64 MB, que no se correspondia con lo que la aplicacion aguanta:
 * el archivo se multiplica por el camino —buffer, cadena UTF-16, copia sin
 * CRLF, clon al cruzar el puente, estado de React, documento de CodeMirror y
 * otra copia mas a cada envio al worker de diff—, asi que 64 MB de disco eran
 * mas de un giga de memoria antes de empezar a comparar. Con este limite el
 * peor caso sigue siendo grande pero no tumba la ventana.
 */
export const MAX_TEXT_BYTES = 12 * 1024 * 1024

const BOM = '﻿'

/** Sufijo del archivo temporal con el que se hace la escritura atomica. */
const TEMP_SUFFIX = '.cotejo-tmp'

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

/**
 * Si el contenido es UTF-8 valido de principio a fin.
 *
 * `buffer.toString('utf8')` no falla nunca: sustituye cada byte invalido por
 * U+FFFD sin decir nada. Un .txt en Windows-1252 con acentos pasa el filtro de
 * binario, se muestra con rombos donde habia eñes y, al guardar, esos rombos
 * se escriben de verdad en el disco. Por eso hace falta preguntarlo aparte.
 */
export function isValidUtf8(buffer: Buffer): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    return true
  } catch {
    return false
  }
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

  return {
    content: text.replace(/\r\n/g, '\n'),
    eol: detectEol(text),
    encoding,
    lossy: !isValidUtf8(buffer)
  }
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

/** Lo que el renderer sabia del archivo cuando lo leyo, para detectar cambios. */
export interface ExpectedState {
  mtimeMs: number
  size: number
}

/**
 * Escribe el archivo.
 *
 * Dos garantias que antes no habia:
 *
 * 1. Si `expected` no cuadra con lo que hay en el disco, no se escribe nada.
 *    El archivo cambio desde que se abrio y guardar encima borraria el trabajo
 *    de quien lo tocara. El renderer decide si insistir.
 * 2. La escritura pasa por un temporal en la misma carpeta y un `rename`
 *    encima. `writeFile` trunca antes de escribir, asi que un corte a mitad
 *    dejaba el archivo a medias; con el rename, o esta el contenido viejo o
 *    esta el nuevo.
 */
export async function writeTextFile(
  path: string,
  content: string,
  eol: Eol,
  encoding: 'utf8' | 'utf8-bom',
  expected?: ExpectedState
): Promise<{ mtimeMs: number; size: number }> {
  if (expected) {
    const current = await stat(path).catch(() => null)
    if (current) {
      // La fecha se compara con un margen de un milisegundo: no todos los
      // sistemas de archivos la guardan con la misma precision que la reportan.
      const moved = Math.abs(current.mtimeMs - expected.mtimeMs) > 1
      if (moved || current.size !== expected.size) {
        throw ipcError('fileChangedOnDisk', { path })
      }
    }
  }

  const data = encodeText(content, eol, encoding)

  // Un enlace simbolico se escribe en su sitio: el rename lo sustituiria por
  // un archivo normal y rompería el enlace, que casi nunca es lo que se quiere.
  const link = await lstat(path).catch(() => null)
  if (link?.isSymbolicLink()) {
    await writeFile(path, data, 'utf8')
  } else {
    const temporary = join(dirname(path), `.${Date.now()}${TEMP_SUFFIX}`)
    try {
      await writeFile(temporary, data, 'utf8')
      await rename(temporary, path)
    } catch (error) {
      await unlink(temporary).catch(() => undefined)
      throw error
    }
  }

  const info = await stat(path)
  return { mtimeMs: info.mtimeMs, size: info.size }
}
