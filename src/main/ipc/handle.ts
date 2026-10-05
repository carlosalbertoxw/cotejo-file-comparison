import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { IpcChannel } from '@shared/ipc-channels'
import { rendererUrl } from '../rendererUrl'
import { logError } from '../services/log'
import { isTrustedFrame } from './sender'

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
    if (!isTrustedFrame(event.senderFrame, rendererUrl())) {
      // Hoy no puede pasar; si pasa, es que algo ajeno ha llegado a hablar con
      // el proceso principal, y eso tiene que quedar escrito en algun sitio.
      const error = new Error(`Remitente no permitido en ${channel}: ${event.senderFrame?.url}`)
      logError('ipc', error)
      throw error
    }
    return listener(event, ...args)
  })
}
