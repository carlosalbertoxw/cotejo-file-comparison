import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { IpcChannel } from '@shared/ipc-channels'
import { rendererUrl } from '../rendererUrl'
import { isAppUrl } from './sender'

/**
 * `ipcMain.handle` que solo atiende a nuestra pagina.
 *
 * Validar los argumentos dice que el mensaje tiene buena forma, no quien lo
 * manda. Hoy solo puede ser nuestro renderer: hay una ventana, no navega, no
 * abre otras y la CSP no deja cargar scripts de fuera. Pero el dia que un
 * cambio meta un iframe, una segunda ventana o afloje la navegacion, ese
 * contenido tendria a mano leer y escribir cualquier archivo del disco. Mirar
 * el marco que envia lo corta aqui, en un solo sitio, para todos los canales.
 */
export function handle(
  channel: IpcChannel,
  listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedSender(event)) throw new Error(`Remitente no permitido en ${channel}`)
    return listener(event, ...args)
  })
}

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame
  // Sin marco (ya se destruyo o navego) no hay a quien responder; con padre,
  // es un iframe dentro de la pagina, que nunca deberia hablar con el disco.
  if (!frame || frame.parent !== null) return false
  return isAppUrl(frame.url, rendererUrl())
}
