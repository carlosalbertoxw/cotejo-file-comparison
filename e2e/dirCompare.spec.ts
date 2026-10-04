/**
 * Las operaciones de carpeta, que son las mas destructivas, de punta a punta:
 * la tabla elige, el proceso principal planifica, el dialogo ensena el plan y
 * lo confirmado es lo que llega al disco.
 *
 * Las pruebas de `test/fileOps.test.ts` cubren el servicio contra el disco; lo
 * que solo se ve aqui es el camino entero: el `relPath` que manda la tabla, el
 * lado de origen, los filtros con los que se escaneo y el dialogo.
 *
 * Como en la de texto, nada depende del idioma: los botones se buscan por su
 * `data-action` y el dialogo por su rol.
 */

import { _electron as electron, expect, test, type ElectronApplication } from '@playwright/test'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

let dir: string
let left: string
let right: string
let app: ElectronApplication

test.beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cotejo-e2e-dir-'))
  left = join(dir, 'izquierda')
  right = join(dir, 'derecha')
  await mkdir(left)
  await mkdir(right)
})

test.afterEach(async () => {
  // Las vistas de carpetas no tienen nada sin guardar, pero si un dialogo
  // nativo se quedara abierto, cerrar esperaria a que alguien lo contestase.
  await app
    ?.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) window.destroy()
    })
    .catch(() => undefined)
  await app?.close()
  await rm(dir, { recursive: true, force: true })
})

async function write(base: string, relPath: string, content: string): Promise<void> {
  const full = join(base, relPath)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, content, 'utf8')
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  )
}

async function launch(): Promise<ReturnType<ElectronApplication['firstWindow']>> {
  app = await electron.launch({
    args: ['.', left, right],
    env: { ...process.env, COTEJO_USER_DATA: join(dir, 'perfil') }
  })
  return app.firstWindow()
}

test('sincronizar a la derecha avisa de lo oculto y lo lleva todo al disco', async () => {
  await write(left, 'solo-izquierda.txt', 'uno')
  await write(left, 'docs/nuevo.md', 'dos')
  // Oculto, dentro de una carpeta que viaja entera: la tabla no lo muestra con
  // los filtros por defecto, y el dialogo tiene que decirlo.
  await write(left, 'docs/.oculto', 'tres')
  await write(right, 'solo-derecha.txt', 'se queda')

  const window = await launch()
  await expect(window.locator('.dir-row', { hasText: 'solo-izquierda.txt' })).toBeVisible()

  await window.locator('[data-action="sync"]').click()

  const dialog = window.locator('[role="dialog"]')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('li', { hasText: 'docs/.oculto' })).toBeVisible()
  await dialog.locator('button.primary').click()

  await expect.poll(() => exists(join(right, 'solo-izquierda.txt'))).toBe(true)
  expect(await readFile(join(right, 'docs/nuevo.md'), 'utf8')).toBe('dos')
  expect(await readFile(join(right, 'docs/.oculto'), 'utf8')).toBe('tres')
  // Sincronizar copia lo que falta; no borra lo que solo estaba en el destino.
  expect(await readFile(join(right, 'solo-derecha.txt'), 'utf8')).toBe('se queda')
  // Ni toca el origen.
  expect(await readFile(join(left, 'solo-izquierda.txt'), 'utf8')).toBe('uno')
})

test('borrar un archivo lo quita de su sitio y solo de su lado', async () => {
  await write(left, 'borrame.txt', 'x')
  await write(left, 'quedate.txt', 'y')
  await write(right, 'borrame.txt', 'otro lado')

  const window = await launch()
  const row = window.locator('.dir-row', { hasText: 'borrame.txt' })
  await expect(row).toBeVisible()

  await row.click()
  await window.locator('[data-action="delete-left"]').click()

  const dialog = window.locator('[role="dialog"]')
  await expect(dialog).toBeVisible()
  // Borrar es la accion peligrosa: el boton de confirmar es el ultimo y no
  // es el primario.
  await dialog.locator('.dialog-actions button').last().click()

  await expect.poll(() => exists(join(left, 'borrame.txt'))).toBe(false)
  expect(await exists(join(left, 'quedate.txt'))).toBe(true)
  expect(await readFile(join(right, 'borrame.txt'), 'utf8')).toBe('otro lado')
})
