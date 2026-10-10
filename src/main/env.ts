import { app } from 'electron'

/**
 * Sin empaquetar: `npm run dev` y las pruebas E2E, que arrancan `out/` con el
 * Electron de node_modules. El ejecutable instalado siempre esta empaquetado.
 */
export const isDev = !app.isPackaged
