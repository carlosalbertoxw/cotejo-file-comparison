import { dialog, BrowserWindow } from 'electron'
import { stat } from 'node:fs/promises'
import { IPC } from '@shared/ipc-channels'
import { parseIpcError } from '@shared/ipc-errors'
import { readTextFile, writeTextFile } from '../services/textFile'
import { logError } from '../services/log'
import { asEnum, asExpectedState, asPath, asString, ENCODINGS, EOLS } from './validate'
import { handle } from './handle'

async function pick(
  event: Electron.IpcMainInvokeEvent,
  title: string,
  property: 'openFile' | 'openDirectory'
): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(event.sender)
  const options = { title, properties: [property] }
  const result = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

/** `writeTextFile`, anotando en el registro los guardados que no llegan al disco. */
async function save(...args: Parameters<typeof writeTextFile>): ReturnType<typeof writeTextFile> {
  try {
    return await writeTextFile(...args)
  } catch (error) {
    // Que el archivo haya cambiado en el disco no es un fallo: es el aviso que
    // deja elegir al usuario. Lo demas es un guardado que no llego.
    const message = (error as Error).message
    if (parseIpcError(message)?.code !== 'fileChangedOnDisk') {
      logError('guardar', `${args[0]}: ${message}`)
    }
    throw error
  }
}

export function registerFsHandlers(): void {
  handle(IPC.pickFile, (event, title: unknown) =>
    pick(event, asString(title, 'title'), 'openFile')
  )
  handle(IPC.pickDirectory, (event, title: unknown) =>
    pick(event, asString(title, 'title'), 'openDirectory')
  )

  handle(IPC.readTextFile, (_e, path: unknown) => readTextFile(asPath(path, 'path')))

  handle(
    IPC.writeTextFile,
    (_e, path: unknown, content: unknown, eol: unknown, encoding: unknown, expected: unknown) =>
      save(
        asPath(path, 'path'),
        asString(content, 'content'),
        asEnum(eol, EOLS, 'eol'),
        asEnum(encoding, ENCODINGS, 'encoding'),
        asExpectedState(expected, 'expected')
      )
  )

  handle(IPC.statPath, async (_e, path: unknown) => {
    const info = await stat(asPath(path, 'path'))
    return { size: info.size, mtimeMs: info.mtimeMs, isDir: info.isDirectory() }
  })
}
