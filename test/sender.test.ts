/**
 * Que mensajes IPC se atienden segun la pagina que los manda. El envoltorio
 * que lo aplica necesita Electron; la decision, que es lo que puede fallar
 * en silencio, es una funcion pura.
 */

import { describe, expect, it } from 'vitest'
import { isAppUrl } from '../src/main/ipc/sender'

describe('isAppUrl en produccion (file:)', () => {
  const app = 'file:///C:/Programas/Cotejo/resources/app.asar/out/renderer/index.html'

  it('acepta la propia pagina, con o sin fragmento', () => {
    expect(isAppUrl(app, app)).toBe(true)
    expect(isAppUrl(`${app}#/algo`, app)).toBe(true)
  })

  it('rechaza otro HTML del disco aunque el origen coincida', () => {
    expect(isAppUrl('file:///C:/Users/ana/Descargas/pagina.html', app)).toBe(false)
  })

  it('rechaza cualquier otro esquema', () => {
    expect(isAppUrl('https://example.com/index.html', app)).toBe(false)
    expect(isAppUrl('data:text/html,hola', app)).toBe(false)
  })
})

describe('isAppUrl en desarrollo (servidor de Vite)', () => {
  const app = 'http://localhost:5173'

  it('acepta cualquier ruta del mismo origen', () => {
    expect(isAppUrl('http://localhost:5173/', app)).toBe(true)
    expect(isAppUrl('http://localhost:5173/index.html?t=1', app)).toBe(true)
  })

  it('rechaza otro puerto u otro host', () => {
    expect(isAppUrl('http://localhost:5174/', app)).toBe(false)
    expect(isAppUrl('http://evil.localhost:5173/', app)).toBe(false)
  })

  it('rechaza lo que no es una URL', () => {
    expect(isAppUrl('', app)).toBe(false)
    expect(isAppUrl('no es una url', app)).toBe(false)
  })
})
