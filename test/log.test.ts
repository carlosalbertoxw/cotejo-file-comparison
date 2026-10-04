import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLog, LOG_FILE, OLD_LOG_FILE } from '../src/main/services/log'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cotejo-log-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('createLog', () => {
  it('no crea nada hasta el primer error', () => {
    createLog(join(dir, 'logs'))
    expect(existsSync(join(dir, 'logs'))).toBe(false)
  })

  it('anota una linea por error, con el ambito y el mensaje', async () => {
    const log = createLog(join(dir, 'logs'))
    await log.error('copy', new Error('EACCES: permiso denegado'))
    await log.error('guardar', 'texto\nen dos lineas')
    const lines = (await readFile(join(dir, 'logs', LOG_FILE), 'utf8')).trimEnd().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^\d{4}-\d\d-\d\dT.* ERROR \[copy\] EACCES: permiso denegado$/)
    expect(lines[1]).toContain('[guardar] texto ⏎ en dos lineas')
  })

  it('las escrituras simultaneas no se pisan', async () => {
    const log = createLog(dir)
    await Promise.all(Array.from({ length: 50 }, (_, i) => log.error('x', `fallo ${i}`)))
    const lines = (await readFile(join(dir, LOG_FILE), 'utf8')).trimEnd().split('\n')
    expect(lines).toHaveLength(50)
    expect(lines.at(-1)).toContain('fallo 49')
  })

  it('cada sesion con errores empieza un archivo y guarda el de la anterior', async () => {
    await createLog(dir).error('x', 'de la primera sesion')
    await createLog(dir).error('x', 'de la segunda')
    expect(await readFile(join(dir, LOG_FILE), 'utf8')).toContain('de la segunda')
    expect(await readFile(join(dir, LOG_FILE), 'utf8')).not.toContain('de la primera')
    expect(await readFile(join(dir, OLD_LOG_FILE), 'utf8')).toContain('de la primera sesion')
  })

  it('una sesion sin errores no toca el registro de la ultima que fallo', async () => {
    await createLog(dir).error('x', 'lo que fallo ayer')
    createLog(dir)
    expect(await readFile(join(dir, LOG_FILE), 'utf8')).toContain('lo que fallo ayer')
    expect(existsSync(join(dir, OLD_LOG_FILE))).toBe(false)
  })

  it('al llegar al tope lo dice una vez y deja de escribir hasta el proximo arranque', async () => {
    const log = createLog(dir, 200)
    for (let i = 0; i < 10; i++) await log.error('x', `fallo numero ${i}`)
    const lines = (await readFile(join(dir, LOG_FILE), 'utf8')).trimEnd().split('\n')
    expect(lines.filter((line) => line.includes('[registro] Lleno'))).toHaveLength(1)
    expect(lines.at(-1)).toContain('[registro] Lleno')
    expect(lines.join('\n')).not.toContain('fallo numero 9')
    // Lo de antes del aviso cabe en el tope.
    expect(Buffer.byteLength(lines.slice(0, -1).join('\n') + '\n')).toBeLessThanOrEqual(200)
  })

  it('un registro que no se puede escribir no hace fallar a nadie', async () => {
    // Un archivo donde deberia ir la carpeta: mkdir falla.
    const blocked = join(dir, 'ocupado')
    await writeFile(blocked, '')
    const log = createLog(blocked)
    await expect(log.error('x', 'fallo')).resolves.toBeUndefined()
    // Y la fila sigue viva para los siguientes.
    await expect(log.error('x', 'otro')).resolves.toBeUndefined()
  })
})
