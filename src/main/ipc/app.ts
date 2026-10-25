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
 * Donde esta el propio programa: la carpeta del ejecutable, o el `.app` entero
 * en macOS, que es lo que el usuario ve y mueve. En la version sin instalar es
 * la carpeta que se descomprimio, y no hay otra forma de encontrarla desde la
 * aplicacion.
 */
function programLocation(): string {
  const exe = process.execPath
  const bundle = exe.lastIndexOf('.app/Contents/MacOS/')
  return bundle === -1 ? dirname(exe) : exe.slice(0, bundle + '.app'.length)
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
        program: programLocation(),
        userData: app.getPath('userData'),
        logs: app.getPath('logs')
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
