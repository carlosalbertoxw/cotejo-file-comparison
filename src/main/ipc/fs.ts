import { dialog, ipcMain, BrowserWindow } from 'electron'
import { stat } from 'node:fs/promises'
import { IPC } from '@shared/ipc-channels'
import { readTextFile, writeTextFile } from '../services/textFile'
import { asEnum, asExpectedState, asPath, asString, ENCODINGS, EOLS } from './validate'

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

export function registerFsHandlers(): void {
  ipcMain.handle(IPC.pickFile, (event, title: unknown) =>
    pick(event, asString(title, 'title'), 'openFile')
  )
  ipcMain.handle(IPC.pickDirectory, (event, title: unknown) =>
    pick(event, asString(title, 'title'), 'openDirectory')
  )

  ipcMain.handle(IPC.readTextFile, (_e, path: unknown) => readTextFile(asPath(path, 'path')))

  ipcMain.handle(
    IPC.writeTextFile,
    (_e, path: unknown, content: unknown, eol: unknown, encoding: unknown, expected: unknown) =>
      writeTextFile(
        asPath(path, 'path'),
        asString(content, 'content'),
        asEnum(eol, EOLS, 'eol'),
        asEnum(encoding, ENCODINGS, 'encoding'),
        asExpectedState(expected, 'expected')
      )
  )

  ipcMain.handle(IPC.statPath, async (_e, path: unknown) => {
    const info = await stat(asPath(path, 'path'))
    return { size: info.size, mtimeMs: info.mtimeMs, isDir: info.isDirectory() }
  })
}
