import { mkdtemp, mkdir, readFile, writeFile, rm, stat, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseIpcError } from '../src/shared/ipc-errors'
import type { FileOpItem, FileOpRequest } from '../src/shared/types'

/**
 * `fileOpsService` es el unico modulo que borra, mueve y sobrescribe archivos
 * del usuario, y era el unico sin ninguna prueba. Lo que mas importa aqui no es
 * que copiar funcione, sino que `safeJoin` no deje salir nada de su raiz y que
 * un borrado vaya a la papelera y no a `unlink`.
 *
 * `shell` viene de Electron, que no existe en un test de Node: se dobla, y de
 * paso el doble sirve para comprobar con que ruta exacta se llama a la papelera.
 */
const trashItem = vi.fn(async (_path: string) => undefined)

vi.mock('electron', () => ({ shell: { trashItem: (path: string) => trashItem(path) } }))

const { planFileOp, runFileOp } = await import('../src/main/services/fileOpsService')

let root: string
let left: string
let right: string

beforeEach(async () => {
  trashItem.mockClear()
  root = await mkdtemp(join(tmpdir(), 'cotejo-ops-'))
  left = join(root, 'left')
  right = join(root, 'right')
  await mkdir(left, { recursive: true })
  await mkdir(right, { recursive: true })
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function write(base: string, relPath: string, content: string): Promise<void> {
  const full = join(base, relPath)
  await mkdir(join(full, '..'), { recursive: true })
  await writeFile(full, content, 'utf8')
}

async function exists(fullPath: string): Promise<boolean> {
  try {
    await stat(fullPath)
    return true
  } catch {
    return false
  }
}

function request(
  kind: FileOpRequest['kind'],
  items: FileOpItem[],
  operationId = 'op'
): FileOpRequest {
  return { operationId, kind, leftRoot: left, rightRoot: right, items }
}

function file(relPath: string, from: FileOpItem['from'] = 'left'): FileOpItem {
  return { relPath, isDir: false, from }
}

function folder(relPath: string, from: FileOpItem['from'] = 'left'): FileOpItem {
  return { relPath, isDir: true, from }
}

describe('safeJoin', () => {
  it('rechaza una ruta relativa que se sale de su raiz', async () => {
    await expect(planFileOp(request('copy', [file('../fuera.txt')]))).rejects.toThrow()

    const error = await planFileOp(request('copy', [file('../fuera.txt')])).catch((e: Error) => e)
    expect(parseIpcError((error as Error).message)?.code).toBe('pathOutsideRoot')
  })

  it('rechaza tambien las que se salen por el medio', async () => {
    const error = await planFileOp(request('copy', [file('sub/../../fuera.txt')])).catch(
      (e: Error) => e
    )
    expect(parseIpcError((error as Error).message)?.code).toBe('pathOutsideRoot')
  })

  it('rechaza una ruta absoluta', async () => {
    const absolute = process.platform === 'win32' ? 'C:\\Windows\\System32' : '/etc/passwd'
    const error = await planFileOp(request('copy', [file(absolute)])).catch((e: Error) => e)
    expect(parseIpcError((error as Error).message)?.code).toBe('absolutePathRejected')
  })

  it('no deja que la operacion apunte a la propia raiz', async () => {
    const error = await planFileOp(request('delete', [folder('.')])).catch((e: Error) => e)
    expect(parseIpcError((error as Error).message)?.code).toBe('pathOutsideRoot')
  })

  it('acepta una ruta relativa normal, con subcarpetas', async () => {
    await write(left, 'sub/a.txt', 'hola')
    const plan = await planFileOp(request('copy', [file('sub/a.txt')]))
    expect(plan.fileCount).toBe(1)
  })
})

describe('planFileOp', () => {
  it('cuenta archivos, carpetas y bytes antes de tocar nada', async () => {
    await write(left, 'a.txt', '12345')
    await write(left, 'dir/b.txt', '123')

    const plan = await planFileOp(request('copy', [file('a.txt'), folder('dir')]))

    expect(plan.fileCount).toBe(1)
    expect(plan.dirCount).toBe(1)
    expect(plan.totalBytes).toBe(8)
  })

  it('avisa de los destinos que ya existen', async () => {
    await write(left, 'a.txt', 'nuevo')
    await write(right, 'a.txt', 'viejo')
    await write(left, 'b.txt', 'solo aqui')

    const plan = await planFileOp(request('copy', [file('a.txt'), file('b.txt')]))

    expect(plan.overwrites).toEqual(['a.txt'])
  })

  it('en un borrado no hay destinos que sobrescribir', async () => {
    await write(left, 'a.txt', 'x')
    const plan = await planFileOp(request('delete', [file('a.txt')]))
    expect(plan.overwrites).toEqual([])
    expect(plan.affected).toEqual([join(left, 'a.txt')])
  })

  it('un movimiento afecta al origen y al destino', async () => {
    await write(left, 'a.txt', 'x')
    const plan = await planFileOp(request('move', [file('a.txt')]))
    expect(plan.affected).toContain(join(left, 'a.txt'))
    expect(plan.affected).toContain(join(right, 'a.txt'))
  })

  it('en una carpeta que existe en los dos lados, lista cada archivo que se pisa', async () => {
    await write(left, 'src/a.ts', 'nuevo')
    await write(left, 'src/sub/b.ts', 'nuevo')
    await write(left, 'src/solo-aqui.ts', 'x')
    await write(right, 'src/a.ts', 'viejo')
    await write(right, 'src/sub/b.ts', 'viejo')

    const plan = await planFileOp(request('copy', [folder('src')]))

    // Antes salia solo «src», y el dialogo no decia que archivos iban a perderse.
    expect(plan.overwrites.sort()).toEqual(['src/a.ts', 'src/sub/b.ts'])
  })

  it('avisa de los ocultos y excluidos que viajan dentro de la carpeta', async () => {
    await write(left, 'src/a.ts', 'x')
    await write(left, 'src/.env', 'CLAVE=izquierda')
    await write(left, 'src/node_modules/m/index.js', 'x')
    await write(right, 'src/.env', 'CLAVE=derecha')

    const plan = await planFileOp({
      ...request('copy', [folder('src')]),
      filters: { exclude: ['**/node_modules/**'], include: [], includeHidden: false }
    })

    expect(plan.overwrites).toEqual(['src/.env'])
    expect(plan.unseen.sort()).toEqual(['src/.env', 'src/node_modules/m/index.js'])
  })

  it('con los ocultos a la vista, un oculto ya no es una sorpresa', async () => {
    await write(left, 'src/.env', 'x')

    const plan = await planFileOp({
      ...request('copy', [folder('src')]),
      filters: { exclude: [], include: [], includeHidden: true }
    })

    expect(plan.unseen).toEqual([])
  })

  it('un archivo seleccionado se ve aunque sea oculto: viene de la tabla', async () => {
    await write(left, '.gitignore', 'x')
    const plan = await planFileOp(request('copy', [file('.gitignore')]))
    expect(plan.unseen).toEqual([])
  })

  it.runIf(process.platform !== 'win32')('no sigue los enlaces simbolicos al planificar', async () => {
    await write(left, 'dir/a.txt', '123')
    // Un enlace a su propia carpeta padre: seguirlo acababa en ELOOP.
    await symlink('..', join(left, 'dir/bucle'))

    const plan = await planFileOp(request('copy', [folder('dir')]))

    expect(plan.totalBytes).toBeLessThan(100)
    expect(plan.unseen).toEqual(['dir/bucle'])
  })

  it('ignora lo que ya no esta en el disco', async () => {
    const plan = await planFileOp(request('copy', [file('fantasma.txt')]))
    expect(plan.fileCount).toBe(0)
    expect(plan.totalBytes).toBe(0)
  })
})

describe('runFileOp: copiar', () => {
  it('copia un archivo al otro lado', async () => {
    await write(left, 'a.txt', 'contenido')

    const result = await runFileOp(request('copy', [file('a.txt')]))

    expect(result.succeeded).toBe(1)
    expect(result.failed).toEqual([])
    expect(await readFile(join(right, 'a.txt'), 'utf8')).toBe('contenido')
  })

  it('sobrescribe el destino que ya existia', async () => {
    await write(left, 'a.txt', 'nuevo')
    await write(right, 'a.txt', 'viejo')

    await runFileOp(request('copy', [file('a.txt')]))

    expect(await readFile(join(right, 'a.txt'), 'utf8')).toBe('nuevo')
  })

  it('manda a la papelera lo que va a sobrescribir antes de copiar encima', async () => {
    await write(left, 'a.txt', 'nuevo')
    await write(right, 'a.txt', 'viejo')
    await write(left, 'b.txt', 'nuevo')

    await runFileOp(request('copy', [file('a.txt'), file('b.txt')]))

    expect(trashItem).toHaveBeenCalledTimes(1)
    expect(trashItem).toHaveBeenCalledWith(join(right, 'a.txt'))
  })

  it('al fusionar una carpeta, cada archivo pisado pasa antes por la papelera', async () => {
    await write(left, 'src/a.ts', 'nuevo')
    await write(left, 'src/.env', 'izquierda')
    await write(right, 'src/a.ts', 'viejo')
    await write(right, 'src/.env', 'derecha')
    await write(right, 'src/solo-derecha.ts', 'se queda')

    await runFileOp(request('copy', [folder('src')]))

    const trashed = trashItem.mock.calls.map(([path]) => path).sort()
    expect(trashed).toEqual([join(right, 'src/.env'), join(right, 'src/a.ts')].sort())
    // Fusionar no es reemplazar: lo que solo estaba en el destino sigue ahi.
    expect(await readFile(join(right, 'src/solo-derecha.ts'), 'utf8')).toBe('se queda')
  })

  it('si la papelera falla, no escribe nada encima', async () => {
    await write(left, 'a.txt', 'nuevo')
    await write(right, 'a.txt', 'viejo')
    trashItem.mockRejectedValueOnce(new Error('sin papelera'))

    const result = await runFileOp(request('copy', [file('a.txt')]))

    expect(result.failed).toHaveLength(1)
    expect(await readFile(join(right, 'a.txt'), 'utf8')).toBe('viejo')
  })

  it('crea las carpetas intermedias que falten en el destino', async () => {
    await write(left, 'muy/hondo/a.txt', 'x')

    await runFileOp(request('copy', [file('muy/hondo/a.txt')]))

    expect(await readFile(join(right, 'muy/hondo/a.txt'), 'utf8')).toBe('x')
  })

  it('copia una carpeta con todo su contenido', async () => {
    await write(left, 'dir/a.txt', '1')
    await write(left, 'dir/sub/b.txt', '2')

    await runFileOp(request('copy', [folder('dir')]))

    expect(await readFile(join(right, 'dir/a.txt'), 'utf8')).toBe('1')
    expect(await readFile(join(right, 'dir/sub/b.txt'), 'utf8')).toBe('2')
  })

  it('no vuelve a copiar lo que ya viajo dentro de su carpeta', async () => {
    await write(left, 'dir/a.txt', '1')

    // La carpeta y su hijo, seleccionados los dos: el hijo ya va dentro.
    const result = await runFileOp(request('copy', [folder('dir'), file('dir/a.txt')]))

    expect(result.succeeded).toBe(1)
    expect(await readFile(join(right, 'dir/a.txt'), 'utf8')).toBe('1')
  })

  it('copia tambien de derecha a izquierda', async () => {
    await write(right, 'a.txt', 'desde la derecha')

    await runFileOp(request('copy', [file('a.txt', 'right')]))

    expect(await readFile(join(left, 'a.txt'), 'utf8')).toBe('desde la derecha')
  })
})

describe('runFileOp: mover', () => {
  it('deja el archivo en el destino y lo quita del origen', async () => {
    await write(left, 'a.txt', 'x')

    await runFileOp(request('move', [file('a.txt')]))

    expect(await exists(join(left, 'a.txt'))).toBe(false)
    expect(await readFile(join(right, 'a.txt'), 'utf8')).toBe('x')
  })

  it('tambien manda a la papelera lo que pisa al mover', async () => {
    await write(left, 'a.txt', 'nuevo')
    await write(right, 'a.txt', 'viejo')

    await runFileOp(request('move', [file('a.txt')]))

    expect(trashItem).toHaveBeenCalledWith(join(right, 'a.txt'))
  })

  it('mueve una carpeta entera', async () => {
    await write(left, 'dir/a.txt', 'x')

    await runFileOp(request('move', [folder('dir')]))

    expect(await exists(join(left, 'dir'))).toBe(false)
    expect(await readFile(join(right, 'dir/a.txt'), 'utf8')).toBe('x')
  })
})

describe('runFileOp: borrar', () => {
  it('manda a la papelera y no borra directamente', async () => {
    await write(left, 'a.txt', 'x')

    const result = await runFileOp(request('delete', [file('a.txt')]))

    expect(result.succeeded).toBe(1)
    expect(trashItem).toHaveBeenCalledTimes(1)
    expect(trashItem).toHaveBeenCalledWith(join(left, 'a.txt'))
    // El doble no borra nada: lo que importa es que se llamo a la papelera.
    expect(await exists(join(left, 'a.txt'))).toBe(true)
  })

  it('borra del lado que se le indica', async () => {
    await write(right, 'a.txt', 'x')

    await runFileOp(request('delete', [file('a.txt', 'right')]))

    expect(trashItem).toHaveBeenCalledWith(join(right, 'a.txt'))
  })
})

describe('runFileOp: fallos y cancelacion', () => {
  it('anota el fallo y sigue con lo demas', async () => {
    await write(left, 'bueno.txt', 'x')

    const result = await runFileOp(request('copy', [file('../malo.txt'), file('bueno.txt')]))

    expect(result.succeeded).toBe(1)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]?.relPath).toBe('../malo.txt')
    expect(await readFile(join(right, 'bueno.txt'), 'utf8')).toBe('x')
  })

  it('para en cuanto se cancela y lo dice', async () => {
    await write(left, 'a.txt', '1')
    await write(left, 'b.txt', '2')

    const result = await runFileOp(request('copy', [file('a.txt'), file('b.txt')]), {
      isCancelled: () => true
    })

    expect(result.cancelled).toBe(true)
    expect(result.succeeded).toBe(0)
    expect(await exists(join(right, 'a.txt'))).toBe(false)
  })

  it('informa del progreso elemento a elemento', async () => {
    await write(left, 'a.txt', '1')
    await write(left, 'b.txt', '2')
    const seen: number[] = []

    await runFileOp(request('copy', [file('a.txt'), file('b.txt')]), {
      onProgress: (done) => seen.push(done)
    })

    expect(seen).toEqual([1, 2])
  })
})
