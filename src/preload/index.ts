import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC } from '@shared/ipc-channels'
import type {
  AppInfo,
  CompareProgress,
  CompareRequest,
  CompareResponse,
  Eol,
  EntryStat,
  FileOpPlan,
  FileOpProgress,
  FileOpRequest,
  FileOpResult,
  TextFilePayload,
  UpdateCheck
} from '@shared/types'

/**
 * Superficie completa que el renderer puede tocar. El renderer no ve `fs` ni
 * `ipcRenderer`: solo estas funciones.
 */
const api = {
  /** El renderer lo necesita para el modificador de los atajos: ⌘ o Ctrl. */
  platform: process.platform,

  pickFile: (title: string): Promise<string | null> => ipcRenderer.invoke(IPC.pickFile, title),
  pickDirectory: (title: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.pickDirectory, title),

  readTextFile: (path: string): Promise<TextFilePayload> =>
    ipcRenderer.invoke(IPC.readTextFile, path),
  writeTextFile: (
    path: string,
    content: string,
    eol: Eol,
    encoding: 'utf8' | 'utf8-bom'
  ): Promise<{ mtimeMs: number; size: number }> =>
    ipcRenderer.invoke(IPC.writeTextFile, path, content, eol, encoding),
  statPath: (path: string): Promise<EntryStat> => ipcRenderer.invoke(IPC.statPath, path),

  compareDirectories: (requestId: string, request: CompareRequest): Promise<CompareResponse> =>
    ipcRenderer.invoke(IPC.compareDirectories, requestId, request),
  cancelCompare: (requestId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.cancelCompare, requestId),
  onCompareProgress: (listener: (progress: CompareProgress) => void): (() => void) => {
    const handler = (_e: unknown, progress: CompareProgress): void => listener(progress)
    ipcRenderer.on(IPC.compareProgress, handler)
    return () => ipcRenderer.removeListener(IPC.compareProgress, handler)
  },

  planFileOp: (request: FileOpRequest): Promise<FileOpPlan> =>
    ipcRenderer.invoke(IPC.planFileOp, request),
  runFileOp: (request: FileOpRequest): Promise<FileOpResult> =>
    ipcRenderer.invoke(IPC.runFileOp, request),
  cancelFileOp: (operationId: string): Promise<void> =>
    ipcRenderer.invoke(IPC.cancelFileOp, operationId),
  onFileOpProgress: (listener: (progress: FileOpProgress) => void): (() => void) => {
    const handler = (_e: unknown, progress: FileOpProgress): void => listener(progress)
    ipcRenderer.on(IPC.fileOpProgress, handler)
    return () => ipcRenderer.removeListener(IPC.fileOpProgress, handler)
  },

  showItemInFolder: (fullPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.showItemInFolder, fullPath),

  /** Abre un enlace en el navegador del sistema. Solo https. */
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IPC.openExternal, url),

  appInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC.appInfo),
  checkForUpdates: (): Promise<UpdateCheck> => ipcRenderer.invoke(IPC.checkForUpdates),

  /** Ruta real de un File soltado en la ventana. `File.path` ya no existe. */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  /** Rutas pasadas al ejecutable, para abrirlas al arrancar. */
  onOpenPaths: (listener: (paths: string[]) => void): (() => void) => {
    const handler = (_e: unknown, paths: string[]): void => listener(paths)
    ipcRenderer.on(IPC.openPathsFromArgv, handler)
    return () => ipcRenderer.removeListener(IPC.openPathsFromArgv, handler)
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
