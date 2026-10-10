import {
  open,
  writeFile,
  rename,
  stat,
  lstat,
  unlink,
  chmod,
  chown,
  type FileHandle
} from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { constants, type Stats } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Eol, TextFilePayload } from '@shared/types'
import { ipcError } from '@shared/ipc-errors'
import { TEMP_SUFFIX } from '@shared/files'

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

/**
 * Todo sobre el mismo descriptor: comprobar el tamano con `stat` y leer
 * despues con `readFile` son dos aperturas, y si el archivo crece o se
 * sustituye entre medias el limite de arriba ya no vale nada. Aqui se lee como
 * mucho lo que `fstat` dijo, y la fecha y el tamano devueltos son los del mismo
 * contenido que se leyo.
 */
export async function readTextFile(path: string): Promise<TextFilePayload> {
  // Windows no deja abrir una carpeta; Linux y macOS si, y es el `stat` del
  // descriptor el que lo dice.
  const handle = await open(path, 'r').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'EISDIR') throw ipcError('notAFile', { path })
    throw error
  })
  try {
    const info = await handle.stat()
    if (info.isDirectory()) throw ipcError('notAFile', { path })
    if (info.size > MAX_TEXT_BYTES) {
      throw ipcError('fileTooLarge', {
        size: (info.size / 1024 / 1024).toFixed(1),
        limit: MAX_TEXT_BYTES / 1024 / 1024
      })
    }

    const buffer = Buffer.alloc(info.size)
    const { bytesRead } = await handle.read(buffer, 0, info.size, 0)
    const content = buffer.subarray(0, bytesRead)
    if (looksBinary(content)) {
      throw ipcError('binaryFile', { path })
    }

    return { path, ...decodeText(content), size: bytesRead, mtimeMs: info.mtimeMs }
  } finally {
    await handle.close()
  }
}

/** Lo que el renderer sabia del archivo cuando lo leyo, para detectar cambios. */
export interface ExpectedState {
  mtimeMs: number
  size: number
}

/**
 * Da al temporal el propietario y los permisos del archivo al que va a
 * sustituir. Sin esto el temporal nace con los del proceso y el umask: un
 * script pierde el bit de ejecucion al guardarlo, y un archivo `0600` queda
 * legible por el grupo.
 *
 * Devuelve `false` si el propietario no se puede conservar, que es lo normal
 * al editar un archivo ajeno con permiso de escritura por grupo.
 *
 * Solo en POSIX: en Windows no se sustituye el archivo (`writeWithBackup`).
 */
async function inheritOwnership(temporary: string, original: Stats): Promise<boolean> {
  const created = await stat(temporary)
  if (created.uid !== original.uid || created.gid !== original.gid) {
    try {
      await chown(temporary, original.uid, original.gid)
    } catch {
      return false
    }
  }
  // Despues del chown, que borra los bits setuid y setgid.
  await chmod(temporary, original.mode & 0o7777)
  return true
}

/**
 * Nombre aleatorio junto al archivo. Se crea siempre con `wx`: dos guardados en
 * el mismo milisegundo no comparten temporal, y si alguien ha dejado algo con
 * ese nombre —un enlace plantado en una carpeta compartida, por ejemplo— la
 * escritura falla en vez de seguirlo y truncar lo que haya al otro lado.
 */
function temporaryFor(path: string): string {
  return join(dirname(path), `.${randomBytes(6).toString('hex')}${TEMP_SUFFIX}`)
}

/** Vacia el archivo abierto y escribe `data` desde el principio. Cierra siempre. */
async function replaceContent(handle: FileHandle, data: string): Promise<void> {
  try {
    await handle.truncate(0)
    await handle.writeFile(data, 'utf8')
    await handle.sync()
  } finally {
    await handle.close()
  }
}

/**
 * Cambia el contenido sin cambiar el archivo: mismo objeto en el disco, asi que
 * conserva todo lo demas —permisos, ACL, atributos, enlaces duros—.
 *
 * Con lectura y escritura sin truncar, y no con `w`: en Windows, abrir con `w`
 * un archivo oculto o de sistema falla con `EPERM`, porque Node pide crearlo de
 * nuevo y Windows no deja hacerlo sin repetir esos atributos. `O_CREAT` cubre
 * el enlace simbolico roto, que no tiene archivo al otro lado: lo crea, como
 * hacia `w`. Una sola apertura, y todo lo demas sobre el descriptor; abrir y,
 * si falla, volver a escribir por la ruta dejaba un hueco entre medias.
 */
async function overwriteInPlace(path: string, data: string): Promise<void> {
  await replaceContent(await open(path, constants.O_RDWR | constants.O_CREAT), data)
}

/**
 * Guardar en Windows un archivo que ya existe.
 *
 * Sustituirlo con un `rename`, como en POSIX, deja en su sitio el temporal, que
 * nace con la ACL heredada de la carpeta y sin los atributos del original: un
 * archivo que el usuario restringio a si mismo pasaba a ser legible para todos
 * los que leen esa carpeta, y uno oculto dejaba de estarlo. Windows no tiene
 * un `chmod` que lo arregle despues, asi que se escribe en el propio archivo.
 *
 * Se pierde la atomicidad, y para no perder tambien el trabajo el contenido
 * nuevo se escribe antes entero en un temporal. Si el archivo no se puede
 * abrir —solo lectura, bloqueado por otro programa— no se ha tocado nada y el
 * temporal sobra. Si falla a mitad de escribir, el temporal se queda: es la
 * copia completa de lo que se queria guardar, y «Acerca de» explica que hacer
 * con uno suelto.
 */
async function writeWithBackup(path: string, data: string): Promise<void> {
  const backup = temporaryFor(path)
  await writeFile(backup, data, { encoding: 'utf8', flag: 'wx' })
  let handle: FileHandle
  try {
    handle = await open(path, 'r+')
  } catch (error) {
    await unlink(backup).catch(() => undefined)
    throw error
  }
  await replaceContent(handle, data)
  // Lo guardado ya esta en el disco; un temporal que no se deja borrar no lo
  // convierte en un fallo.
  await unlink(backup).catch(() => undefined)
}

/**
 * Escribe el archivo.
 *
 * Tres garantias:
 *
 * 1. Si `expected` no cuadra con lo que hay en el disco, no se escribe nada.
 *    El archivo cambio desde que se abrio y guardar encima borraria el trabajo
 *    de quien lo tocara. El renderer decide si insistir.
 * 2. Un corte a mitad no deja el archivo a medias sin remedio. En POSIX la
 *    escritura pasa por un temporal en la misma carpeta y un `rename` encima:
 *    o esta el contenido viejo o esta el nuevo. En Windows se escribe en el
 *    sitio, con el contenido nuevo guardado antes en un temporal
 *    (`writeWithBackup`).
 * 3. El archivo que queda conserva el propietario y los permisos del que
 *    habia (`inheritOwnership` en POSIX; en Windows, la ACL y los atributos),
 *    y los enlaces duros siguen compartiendo contenido.
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
  // Lo mismo con varios enlaces duros: el rename dejaria a este nombre con el
  // contenido nuevo y a los demas con el viejo, sin que nada lo avise.
  const original = await lstat(path).catch(() => null)
  if (original && (original.isSymbolicLink() || original.nlink > 1)) {
    await overwriteInPlace(path, data)
  } else if (original && process.platform === 'win32') {
    await writeWithBackup(path, data)
  } else {
    const temporary = temporaryFor(path)
    let created = false
    try {
      await writeFile(temporary, data, { encoding: 'utf8', flag: 'wx' })
      created = true
      if (original && !(await inheritOwnership(temporary, original))) {
        // Sin poder conservar el propietario, sustituir el archivo se lo
        // quedaria a quien guarda. Se pierde la atomicidad, que es lo menos
        // malo de las dos cosas.
        await unlink(temporary)
        created = false
        await overwriteInPlace(path, data)
      } else {
        await rename(temporary, path)
      }
    } catch (error) {
      // Solo se borra lo que se creo aqui: si `wx` fallo, el archivo es de otro.
      if (created) await unlink(temporary).catch(() => undefined)
      throw error
    }
  }

  const info = await stat(path)
  return { mtimeMs: info.mtimeMs, size: info.size }
}
