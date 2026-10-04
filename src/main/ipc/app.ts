import { app, shell, type WebContents } from 'electron'
import { dirname } from 'node:path'
import { IPC } from '@shared/ipc-channels'
import type { AppInfo, CloseGuard } from '@shared/types'
import { checkForUpdates } from '../services/updates'
import { asCloseGuard, asPath, asString } from './validate'
import { handle } from './handle'

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

/**
 * Aviso al cerrar, por ventana. Lo mantiene al dia el renderer: lo pone en
 * cuanto hay algo sin guardar y lo quita cuando ya no.
 */
const closeGuards = new WeakMap<WebContents, CloseGuard>()

export function closeGuardFor(contents: WebContents): CloseGuard | undefined {
  return closeGuards.get(contents)
}

export function clearCloseGuard(contents: WebContents): void {
  closeGuards.delete(contents)
}

export function registerAppHandlers(): void {
  handle(
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

  handle(IPC.checkForUpdates, () => checkForUpdates())

  handle(IPC.openExternal, async (_e, raw: unknown) => {
    const url = asString(raw, 'url')
    if (!isSafeExternalUrl(url)) throw new Error(`URL no permitida: ${url}`)
    await shell.openExternal(url)
  })

  handle(IPC.setCloseGuard, (event, raw: unknown) => {
    const guard = asCloseGuard(raw)
    if (guard) closeGuards.set(event.sender, guard)
    else closeGuards.delete(event.sender)
  })

  handle(IPC.showItemInFolder, (_e, fullPath: unknown) => {
    shell.showItemInFolder(asPath(fullPath, 'fullPath'))
  })
}
