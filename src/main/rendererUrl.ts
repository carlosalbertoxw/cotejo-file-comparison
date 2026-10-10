import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDev } from './env'

/** La unica pagina que la ventana tiene permitido cargar. */
export function rendererUrl(): string {
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    return process.env['ELECTRON_RENDERER_URL']
  }
  return pathToFileURL(join(__dirname, '../renderer/index.html')).href
}
