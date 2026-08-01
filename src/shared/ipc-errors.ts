/**
 * Errores estructurados a traves del puente IPC.
 *
 * Electron solo conserva `Error.message` al cruzar `ipcMain.handle` (y ademas
 * le antepone "Error invoking remote method ..."), asi que el codigo y sus
 * parametros viajan serializados dentro del propio mensaje.
 */

export const IPC_ERROR_MARKER = 'COTEJO_ERR;'

export type IpcErrorCode =
  | 'notAFile'
  | 'fileTooLarge'
  | 'binaryFile'
  | 'absolutePathRejected'
  | 'pathOutsideRoot'

export interface IpcErrorPayload {
  code: IpcErrorCode
  params?: Record<string, string | number>
}

export function ipcError(code: IpcErrorCode, params?: Record<string, string | number>): Error {
  return new Error(IPC_ERROR_MARKER + JSON.stringify({ code, params }))
}

export function parseIpcError(message: string): IpcErrorPayload | null {
  const start = message.indexOf(IPC_ERROR_MARKER)
  if (start === -1) return null
  try {
    const payload = JSON.parse(message.slice(start + IPC_ERROR_MARKER.length)) as IpcErrorPayload
    return typeof payload.code === 'string' ? payload : null
  } catch {
    return null
  }
}
