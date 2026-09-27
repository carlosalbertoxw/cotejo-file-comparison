import { defineConfig } from '@playwright/test'

/**
 * Pruebas de extremo a extremo sobre la aplicacion construida (`out/`), no
 * sobre el codigo fuente: son las que ven el preload, el puente IPC y el
 * proceso principal trabajando juntos. Necesitan `npm run build` antes.
 *
 * Una a una: cada prueba arranca su propio Electron, y en paralelo solo se
 * pelearian por la pantalla.
 */
export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  timeout: 60_000,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list'
})
