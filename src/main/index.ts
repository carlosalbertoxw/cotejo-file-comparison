import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { IPC } from '@shared/ipc-channels'
import { registerFsHandlers } from './ipc/fs'
import { registerDirCompareHandlers } from './ipc/dirCompare'
import { registerFileOpsHandlers } from './ipc/fileOps'
import { registerAppHandlers } from './ipc/app'

/**
 * Argumentos que son rutas de verdad. En desarrollo argv incluye el ejecutable
 * de Electron y el directorio del proyecto, asi que hay que saltarselos.
 *
 * Permite `cotejo izquierda derecha` desde la terminal o desde el explorador.
 */
function pathsFromArgv(argv: string[]): string[] {
  const start = is.dev ? 2 : 1
  return argv
    .slice(start)
    .filter((argument) => !argument.startsWith('-'))
    .filter((argument) => existsSync(argument))
    .slice(0, 2)
}

/**
 * macOS no pasa las rutas por argv: entrega un `open-file` por cada archivo,
 * incluso antes de que la aplicacion este lista. Se acumulan y se entregan
 * juntas, porque abrir dos archivos son dos eventos seguidos y cada uno por
 * separado abriria una pestana a medias.
 */
let mainWindow: BrowserWindow | null = null
const pendingPaths: string[] = []
let flushTimer: NodeJS.Timeout | null = null

function deliverPaths(paths: string[]): void {
  if (paths.length === 0) return
  if (mainWindow && !mainWindow.webContents.isLoading()) {
    mainWindow.webContents.send(IPC.openPathsFromArgv, paths.slice(0, 2))
  } else {
    pendingPaths.push(...paths)
  }
}

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  pendingPaths.push(filePath)
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    deliverPaths(pendingPaths.splice(0, pendingPaths.length))
  }, 50)
})

/**
 * En desarrollo se ejecuta el binario de Electron tal cual, sin ningun
 * empaquetado del que sacar el icono, asi que la ventana sale con el de
 * Electron. En produccion no hace falta: lo lleva el .exe en Windows, el
 * bundle .app en macOS y la entrada .desktop en Linux.
 */
function devIcon(): { icon: string } | undefined {
  if (!is.dev) return undefined
  const icon = join(__dirname, '../../build/icon.png')
  return existsSync(icon) ? { icon } : undefined
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    show: false,
    backgroundColor: '#f3f3f3',
    autoHideMenuBar: true,
    title: 'Cotejo',
    ...devIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
    // argv en Windows y Linux; lo que haya llegado por `open-file` en macOS.
    const paths = [...pathsFromArgv(process.argv), ...pendingPaths.splice(0, pendingPaths.length)]
    if (paths.length > 0) window.webContents.send(IPC.openPathsFromArgv, paths.slice(0, 2))
  })

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  // Nada de navegacion externa dentro de la ventana: los enlaces van al
  // navegador, y solo si son https. Cualquier otro esquema se queda sin abrir.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow = window
  return window
}

void app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.carlos.cotejo')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerFsHandlers()
  registerDirCompareHandlers()
  registerFileOpsHandlers()
  registerAppHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
