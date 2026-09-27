/**
 * El flujo que mas importa, de punta a punta: abrir dos archivos desde la
 * linea de comandos, copiar un bloque de un lado al otro y guardar.
 *
 * Las pruebas de `test/` cubren cada pieza por separado; esto comprueba lo que
 * solo existe con todas montadas: que el preload carga con el sandbox puesto,
 * que las rutas de argv llegan a una pestana, que el worker de diff arranca
 * desde `file://` y que el guardado cruza el puente y llega al disco.
 *
 * Nada depende del idioma de la interfaz, que en CI es el del sistema: se
 * localizan los elementos por su clase y el atajo de guardar es el mismo en
 * los cuatro idiomas.
 */

import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test'
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const FIXTURES = resolve('test/fixtures')

let dir: string
let app: ElectronApplication

test.beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cotejo-e2e-'))
})

test.afterEach(async () => {
  await app?.close()
  await rm(dir, { recursive: true, force: true })
})

/** Las lineas del archivo, sin depender de que Git lo sacara con CRLF. */
async function lines(path: string): Promise<string[]> {
  return (await readFile(path, 'utf8')).split(/\r?\n/)
}

test('copiar un bloque al otro lado y guardar lo escribe en el disco', async () => {
  const left = join(dir, 'izquierda.ts')
  const right = join(dir, 'derecha.ts')
  await copyFile(join(FIXTURES, 'left/src/app.ts'), left)
  await copyFile(join(FIXTURES, 'right/src/app.ts'), right)
  const leftBefore = await lines(left)
  const rightBefore = await lines(right)

  app = await electron.launch({
    args: ['.', left, right],
    env: { ...process.env, COTEJO_USER_DATA: join(dir, 'perfil') }
  })
  const window = await app.firstWindow()

  // El primer bloque es la linea `timeout: number`, que solo existe a la
  // derecha: copiar la izquierda encima la borra.
  const blocks = window.locator('.merge-block')
  await expect(blocks.first()).toBeVisible()
  const before = await blocks.count()

  await blocks.first().locator('.merge-arrow').first().click()
  await expect(blocks).toHaveCount(before - 1)

  await window.keyboard.press(process.platform === 'darwin' ? 'Meta+S' : 'Control+S')

  const removed = rightBefore.indexOf('  timeout: number')
  expect(removed).toBeGreaterThan(-1)
  const expected = rightBefore.filter((_line, index) => index !== removed)
  await expect.poll(() => lines(right)).toEqual(expected)
  expect(await lines(left)).toEqual(leftBefore)
})
