import { dialog, ipcMain, BrowserWindow } from 'electron'
import { stat } from 'node:fs/promises'
import { IPC } from '@shared/ipc-channels'
import type { Eol } from '@shared/types'
import { readTextFile, writeTextFile } from '../services/textFile'

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
  ipcMain.handle(IPC.pickFile, (event, title: string) => pick(event, title, 'openFile'))
  ipcMain.handle(IPC.pickDirectory, (event, title: string) => pick(event, title, 'openDirectory'))

  ipcMain.handle(IPC.readTextFile, (_e, path: string) => readTextFile(path))

  ipcMain.handle(
    IPC.writeTextFile,
    (_e, path: string, content: string, eol: Eol, encoding: 'utf8' | 'utf8-bom') =>
      writeTextFile(path, content, eol, encoding)
  )

  ipcMain.handle(IPC.statPath, async (_e, path: string) => {
    const info = await stat(path)
    return { size: info.size, mtimeMs: info.mtimeMs, isDir: info.isDirectory() }
  })
}
