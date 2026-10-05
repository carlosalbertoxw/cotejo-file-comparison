/**
 * Lo que pasa al arrancar, antes de tocar nada: de donde salen las rutas de la
 * linea de comandos y donde deja Cotejo su registro de errores.
 *
 * Como en el resto de la E2E, nada depende del idioma de la interfaz: los
 * elementos se buscan por su clase.
 */

import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test'
import { access, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

let dir: string
let app: ElectronApplication

test.beforeEach(async () => {
  // Con la ruta real: en macOS la carpeta temporal cuelga de /var, que es un
  // enlace a /private/var, y un proceso lanzado ahi ve su carpeta de trabajo
  // ya resuelta. Sin esto la prueba esperaria /var/... y Cotejo abriria el
  // mismo archivo escrito como /private/var/...
  dir = await realpath(await mkdtemp(join(tmpdir(), 'cotejo-e2e-launch-')))
})

test.afterEach(async () => {
  await app?.close()
  await rm(dir, { recursive: true, force: true })
})

test('las rutas relativas se abren desde la carpeta en la que se lanzo', async () => {
  await writeFile(join(dir, 'izquierda.txt'), 'uno\ndos\n')
  await writeFile(join(dir, 'derecha.txt'), 'uno\ntres\n')

  // Lanzado desde `dir` con rutas relativas, como `cotejo izquierda.txt
  // derecha.txt` en una terminal. El proyecto se pasa absoluto: con otra
  // carpeta de trabajo, '.' ya no seria el.
  app = await electron.launch({
    args: [resolve('.'), 'izquierda.txt', 'derecha.txt'],
    cwd: dir,
    env: { ...process.env, COTEJO_USER_DATA: join(dir, 'perfil') }
  })
  const window = await app.firstWindow()

  // Llegan completas a la pestana: asi se guardan en la sesion y en el
  // historial, y siguen valiendo en el siguiente arranque.
  const paths = window.locator('.path-slot input')
  await expect(paths.nth(0)).toHaveValue(join(dir, 'izquierda.txt'))
  await expect(paths.nth(1)).toHaveValue(join(dir, 'derecha.txt'))
  await expect(window.locator('.merge-block').first()).toBeVisible()
})

test('«Acerca de» dice donde queda el registro de errores, y la carpeta existe', async () => {
  const profile = join(dir, 'perfil')
  app = await electron.launch({
    args: ['.'],
    env: { ...process.env, COTEJO_USER_DATA: profile }
  })
  const window = await app.firstWindow()

  const logs = await app.evaluate(({ app: electronApp }) => electronApp.getPath('logs'))
  await window.locator('.tab-about').click()
  await expect(window.locator('.about-path', { hasText: logs })).toBeVisible()

  // El boton de mostrarla necesita que exista aunque nada haya fallado aun.
  await expect.poll(() => access(logs).then(() => true, () => false)).toBe(true)
})
