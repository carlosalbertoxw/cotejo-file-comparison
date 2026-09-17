import { app, ipcMain, shell } from 'electron'
import { dirname } from 'node:path'
import { IPC } from '@shared/ipc-channels'
import type { AppInfo } from '@shared/types'
import { checkForUpdates } from '../services/updates'
import { asPath, asString } from './validate'

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

/**
 * Los dos formatos portables se ejecutan desde una copia descomprimida en una
 * carpeta temporal: el .exe portable de Windows avisa con
 * `PORTABLE_EXECUTABLE_DIR` y la AppImage con `APPIMAGE`. En ambos casos el
 * ejecutable que corre esta dentro de esa carpeta.
 */
function portableExtractDir(): string | null {
  if (process.env['PORTABLE_EXECUTABLE_DIR'] || process.env['APPIMAGE']) {
    return dirname(process.execPath)
  }
  return null
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
      arch: process.arch,
      paths: {
        userData: app.getPath('userData'),
        portableExtract: portableExtractDir()
      }
    })
  )

  ipcMain.handle(IPC.checkForUpdates, () => checkForUpdates())

  ipcMain.handle(IPC.openExternal, async (_e, raw: unknown) => {
    const url = asString(raw, 'url')
    if (!isSafeExternalUrl(url)) throw new Error(`URL no permitida: ${url}`)
    await shell.openExternal(url)
  })

  ipcMain.handle(IPC.showItemInFolder, (_e, fullPath: unknown) => {
    shell.showItemInFolder(asPath(fullPath, 'fullPath'))
  })
}
