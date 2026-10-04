import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pathsFromArgv } from '../src/main/argv'

let root: string
let launched: string
let other: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'cotejo-argv-'))
  // La carpeta desde la que se lanza la orden y otra que tiene un archivo con
  // el mismo nombre: la del proceso que ya estaba abierto.
  launched = join(root, 'lanzada')
  other = join(root, 'otra')
  await mkdir(launched)
  await mkdir(other)
  await writeFile(join(launched, 'notas.txt'), 'la que se pidio')
  await writeFile(join(launched, 'b.txt'), 'b')
  await writeFile(join(other, 'notas.txt'), 'otra con el mismo nombre')
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('pathsFromArgv', () => {
  it('resuelve las relativas contra la carpeta desde la que se lanzo', () => {
    // Es el caso de la segunda instancia: el proceso que recibe el argv vive
    // en `other`, pero `notas.txt` se escribio en `launched`.
    expect(pathsFromArgv(['cotejo', 'notas.txt', 'b.txt'], launched, 1)).toEqual([
      join(launched, 'notas.txt'),
      join(launched, 'b.txt')
    ])
  })

  it('no abre el archivo de igual nombre de otra carpeta', () => {
    const [path] = pathsFromArgv(['cotejo', 'notas.txt'], launched, 1)
    expect(path).not.toBe(join(other, 'notas.txt'))
  })

  it('deja las absolutas como estan', () => {
    const absolute = join(other, 'notas.txt')
    expect(pathsFromArgv(['cotejo', absolute], launched, 1)).toEqual([absolute])
  })

  it('descarta opciones, lo que no existe y lo que pasa de dos', () => {
    const argv = ['cotejo', '--inspect', 'no-existe.txt', 'notas.txt', 'b.txt', 'notas.txt']
    expect(pathsFromArgv(argv, launched, 1)).toEqual([
      join(launched, 'notas.txt'),
      join(launched, 'b.txt')
    ])
  })

  it('se salta los argumentos que no son rutas del usuario', () => {
    // En desarrollo, el ejecutable de Electron y el directorio del proyecto.
    expect(pathsFromArgv(['electron', '.', 'notas.txt'], launched, 2)).toEqual([
      join(launched, 'notas.txt')
    ])
  })
})
