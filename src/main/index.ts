import { app, nativeTheme, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
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

/** La unica pagina que la ventana tiene permitido cargar. */
function rendererUrl(): string {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return process.env['ELECTRON_RENDERER_URL']
  }
  return pathToFileURL(join(__dirname, '../renderer/index.html')).href
}

function createWindow(): BrowserWindow {
  const url = rendererUrl()

  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    show: false,
    // El fondo se pinta antes de que exista la hoja de estilos; en tema oscuro
    // un blanco fijo aqui es un fogonazo cada vez que se abre la aplicacion.
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#161c1f' : '#f3f3f3',
    autoHideMenuBar: true,
    title: 'Cotejo',
    ...devIcon(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Con sandbox el preload corre sin Node: solo le quedan contextBridge,
      // ipcRenderer y webUtils, que es exactamente lo que usa.
      sandbox: true,
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
  window.webContents.setWindowOpenHandler(({ url: target }) => {
    if (target.startsWith('https://')) void shell.openExternal(target)
    return { action: 'deny' }
  })

  /**
   * La ventana no navega a ningun sitio, nunca.
   *
   * `setWindowOpenHandler` solo cubre las ventanas nuevas; esto cubre al propio
   * documento. Sin ello, soltar un .html sobre una zona sin gestor de `drop`
   * —el fallback del ErrorBoundary, por ejemplo— cargaria ese archivo en la
   * ventana con el preload puesto, y `window.api` quedaria en manos de un
   * documento ajeno.
   */
  window.webContents.on('will-navigate', (event, target) => {
    if (target !== url) event.preventDefault()
  })

  void window.loadURL(url)

  mainWindow = window
  return window
}

/**
 * Una sola instancia.
 *
 * Cotejo se abre con rutas: desde la terminal, arrastrando al ejecutable o con
 * «Abrir con». Sin este cerrojo, cada apertura levanta una aplicacion nueva en
 * vez de anadir una pestana, y dos instancias se pisan el `localStorage` de la
 * sesion al cerrarse.
 */
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    deliverPaths(pathsFromArgv(argv))
  })

  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    pendingPaths.push(filePath)
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(() => {
      flushTimer = null
      deliverPaths(pendingPaths.splice(0, pendingPaths.length))
    }, 50)
  })

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
}
