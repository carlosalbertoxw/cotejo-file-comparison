import { app, ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type { AppInfo } from '@shared/types'
import { checkForUpdates } from '../services/updates'

/**
 * Solo https sale al navegador. El renderer nunca deberia pedir otra cosa,
 * pero abrir sin mirar lo que llega por IPC convierte cualquier cadena en un
 * `file:` o un `cmd:` ejecutandose fuera del sandbox.
 */
function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

export function registerAppHandlers(): void {
  ipcMain.handle(
    IPC.appInfo,
    (): AppInfo => ({
      version: app.getVersion(),
      electron: process.versions.electron,
      chromium: process.versions.chrome,
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch
    })
  )

  ipcMain.handle(IPC.checkForUpdates, () => checkForUpdates())

  ipcMain.handle(IPC.openExternal, async (_e, url: string) => {
    if (!isSafeExternalUrl(url)) throw new Error(`URL no permitida: ${url}`)
    await shell.openExternal(url)
  })

  ipcMain.handle(IPC.showItemInFolder, (_e, fullPath: string) => {
    shell.showItemInFolder(fullPath)
  })
}
