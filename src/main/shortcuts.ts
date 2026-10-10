import type { BrowserWindow } from 'electron'
import { isDev } from './env'

/**
 * Atajos de Chromium que la ventana no debe atender.
 *
 * Recargar es el que importa: la pagina vuelve a empezar sin preguntar y se
 * lleva por delante lo que hubiera sin guardar, porque el aviso al cerrar se
 * borra en cuanto empieza la carga (`did-start-loading` en index.ts). En
 * desarrollo se deja, y F12 abre las herramientas de desarrollo, que en el
 * ejecutable empaquetado no existen (`devTools` en `webPreferences`).
 *
 * Alejar (`Ctrl -`) y acercar con mayusculas (`Ctrl Shift =`) se bloquean
 * tambien, igual que hacia `@electron-toolkit/utils`, de donde sale esto.
 */
export function guardWindowShortcuts(window: BrowserWindow): void {
  const { webContents } = window
  webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const mod = input.control || input.meta

    if (!isDev && input.code === 'KeyR' && mod) event.preventDefault()

    if (isDev && input.code === 'F12') {
      if (webContents.isDevToolsOpened()) webContents.closeDevTools()
      else webContents.openDevTools({ mode: 'undocked' })
    }

    if (input.code === 'Minus' && mod) event.preventDefault()
    if (input.code === 'Equal' && input.shift && mod) event.preventDefault()
  })
}
