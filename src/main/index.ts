import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { IPC } from '@shared/ipc-channels'
import { registerFsHandlers } from './ipc/fs'
import { registerDirCompareHandlers } from './ipc/dirCompare'
import { registerFileOpsHandlers } from './ipc/fileOps'

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
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
    const paths = pathsFromArgv(process.argv)
    if (paths.length > 0) window.webContents.send(IPC.openPathsFromArgv, paths)
  })

  // Nada de navegacion externa dentro de la ventana: los enlaces van al navegador.
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

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

  ipcMain.handle(IPC.showItemInFolder, (_e, fullPath: string) => {
    shell.showItemInFolder(fullPath)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
