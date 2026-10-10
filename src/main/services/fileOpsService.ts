import { shell } from 'electron'
import { cp, lstat, mkdir, readdir, realpath, rename, rm } from 'node:fs/promises'
import type { Stats } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import {
  DEFAULT_FILTERS,
  type FileOpItem,
  type FileOpKind,
  type FileOpPlan,
  type FileOpRequest,
  type Side
} from '@shared/types'
import { ipcError } from '@shared/ipc-errors'
import { createVisibility } from './scanner'

export interface FileOpCallbacks {
  onProgress?: (done: number, total: number, currentPath: string) => void
  isCancelled?: () => boolean
}

function rootFor(request: Pick<FileOpRequest, 'leftRoot' | 'rightRoot'>, side: Side): string {
  return side === 'left' ? request.leftRoot : request.rightRoot
}

function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left'
}

/**
 * Rechaza rutas que escapen de su raiz. `relPath` viene del renderer, y aunque
 * lo genere nuestro propio arbol, un `..` colado aqui borraria archivos fuera
 * de las carpetas que el usuario esta comparando.
 */
function safeJoin(root: string, relPath: string): string {
  if (isAbsolute(relPath)) {
    throw ipcError('absolutePathRejected', { path: relPath })
  }
  const base = resolve(root)
  const full = resolve(base, relPath)
  const rel = relative(base, full)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`)) {
    throw ipcError('pathOutsideRoot', { path: relPath })
  }
  return full
}

/**
 * La ruta real de `path`, con los enlaces resueltos, aunque todavia no exista.
 *
 * Lo que no existe —el destino de una copia, o la carpeta del otro lado si aun
 * no se ha creado— no tiene ruta real: se resuelve su primer ancestro que si
 * existe y se le anade el resto tal cual, que no puede contener enlaces porque
 * no hay nada en el disco.
 */
async function realPathOf(path: string): Promise<string> {
  try {
    return await realpath(path)
  } catch (error) {
    const parent = dirname(path)
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || parent === path) throw error
    return join(await realPathOf(parent), basename(path))
  }
}

/**
 * Que una ruta, ya pasada por `safeJoin`, siga dentro de su raiz en el disco.
 *
 * `safeJoin` mira el texto, y el texto no sabe de enlaces: si una carpeta del
 * camino es un enlace simbolico o una union de Windows, `raiz/enlace/a.txt`
 * pasa la comprobacion y acaba en cualquier otro sitio. El arbol de la tabla
 * no los produce, porque el escaneo no entra en enlaces, pero el destino de una
 * copia si los atraviesa: si al otro lado `docs` es un enlace a otra carpeta,
 * fusionar `docs` sobrescribiria y mandaria a la papelera archivos de alli.
 *
 * Se juzga la carpeta que contiene la ruta y no la ruta misma: el elemento
 * puede ser un enlace, que se copia o se borra como enlace sin seguirlo.
 * `realRoot` llega ya resuelto para no repetir la llamada en cada archivo.
 */
async function assertInsideRoot(realRoot: string, full: string, relPath: string): Promise<void> {
  const rel = relative(realRoot, await realPathOf(dirname(full)))
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw ipcError('pathOutsideRoot', { path: relPath })
  }
}

/**
 * `safeJoin` y `assertInsideRoot` juntos: la ruta de un elemento, confinada de
 * verdad, y la raiz real contra la que se confinara lo que cuelga de el.
 */
async function confinedPath(
  root: string,
  relPath: string
): Promise<{ full: string; realRoot: string }> {
  const full = safeJoin(root, relPath)
  const realRoot = await realPathOf(root)
  await assertInsideRoot(realRoot, full, relPath)
  return { full, realRoot }
}

/**
 * Los elementos que no viajan ya dentro de una carpeta tambien seleccionada.
 *
 * Seleccionar `docs` y `docs/a.txt` es copiar `docs`: el archivo va dentro.
 * Contarlo aparte hacia que el dialogo anunciara un archivo y unos bytes de
 * mas que la operacion nunca procesa.
 */
export function withoutNested<T extends Pick<FileOpItem, 'relPath' | 'isDir'>>(items: T[]): T[] {
  const dirs = new Set(items.filter((item) => item.isDir).map((item) => item.relPath))
  return items.filter((item) => !hasAncestorIn(item.relPath, dirs))
}

/**
 * Si alguna carpeta que contiene a `relPath` esta en `dirs`.
 *
 * Se preguntan los ancestros al conjunto, uno por nivel, en vez de recorrer el
 * conjunto por cada elemento: con miles de carpetas seleccionadas eso era
 * cuadratico, y corre en el proceso principal, que es el que pinta la ventana.
 */
export function hasAncestorIn(relPath: string, dirs: ReadonlySet<string>): boolean {
  for (let slash = relPath.indexOf('/'); slash !== -1; slash = relPath.indexOf('/', slash + 1)) {
    if (dirs.has(relPath.slice(0, slash))) return true
  }
  return false
}

/** Lo que hay debajo de un elemento de la operacion, visto sin seguir enlaces. */
interface WalkEntry {
  /** Relativa a la raiz de la comparacion, con separadores posix. */
  relPath: string
  fullPath: string
  isDir: boolean
  /** Tamano propio: en un enlace, el del enlace y no el de su destino. */
  size: number
  /** Si el escaneo, con los filtros con los que se hizo, lo puso en la tabla. */
  visible: boolean
}

/**
 * Recorre un elemento y todo lo que cuelga de el.
 *
 * Con `lstat` y sin bajar por los enlaces simbolicos, igual que el escaneo y
 * que `cp`, que los copia como enlace. Seguirlos hacia una carpeta como `~`
 * pondria a planificar a recorrer un arbol que no se va a copiar, y uno que
 * apunte a un ancestro terminaria en `ELOOP`.
 *
 * El propio elemento cuenta como visible: viene de la tabla. Lo que esta
 * debajo se juzga con las mismas reglas que el escaneo, y una carpeta que no
 * se ve arrastra a todo su contenido.
 */
async function* walk(
  fullPath: string,
  relPath: string,
  isVisible: ReturnType<typeof createVisibility>,
  visible = true
): AsyncGenerator<WalkEntry> {
  const info = await lstat(fullPath)
  const isDir = info.isDirectory()
  yield { relPath, fullPath, isDir, size: isDir ? 0 : info.size, visible }
  if (!isDir) return
  for (const entry of await readdir(fullPath, { withFileTypes: true })) {
    const childRel = `${relPath}/${entry.name}`
    const childVisible =
      visible &&
      isVisible(childRel, {
        name: entry.name,
        isDir: entry.isDirectory(),
        isSymlink: entry.isSymbolicLink()
      })
    yield* walk(join(fullPath, entry.name), childRel, isVisible, childVisible)
  }
}

async function lstatOrNull(fullPath: string): Promise<Stats | null> {
  try {
    return await lstat(fullPath)
  } catch {
    return null
  }
}

/** Archivos que se van a escribir encima de otro que ya existe en el destino. */
interface Overwrite {
  relPath: string
  target: string
}

/**
 * Lo que la copia o el movimiento de un elemento van a pisar.
 *
 * Una carpeta que existe en los dos lados se fusiona: cada archivo de dentro
 * que ya este en el destino se sustituye. Por eso no basta con mirar el
 * elemento seleccionado, hay que bajar archivo por archivo.
 *
 * De paso confina cada destino (`assertInsideRoot`): una subcarpeta del otro
 * lado puede ser un enlace aunque la carpeta seleccionada no lo sea, y escribir
 * o mandar a la papelera a traves de ella saldria de la raiz.
 */
async function overwritesOf(
  source: string,
  target: string,
  relPath: string,
  realTargetRoot: string,
  isVisible: ReturnType<typeof createVisibility> = () => true
): Promise<{ overwrites: Overwrite[]; entries: WalkEntry[] }> {
  const overwrites: Overwrite[] = []
  const entries: WalkEntry[] = []
  for await (const entry of walk(source, relPath, isVisible)) {
    entries.push(entry)
    const destination = join(target, relative(source, entry.fullPath))
    await assertInsideRoot(realTargetRoot, destination, entry.relPath)
    if (entry.isDir) continue
    const existing = await lstatOrNull(destination)
    // Un archivo contra una carpeta no se pisa: `cp` falla y el fallo se
    // cuenta en el resultado, que es lo que tiene que pasar.
    if (existing && !existing.isDirectory()) {
      overwrites.push({ relPath: entry.relPath, target: destination })
    }
  }
  return { overwrites, entries }
}

/**
 * Calcula que va a pasar antes de tocar el disco. Lo que devuelve es
 * exactamente lo que se le muestra al usuario en el dialogo de confirmacion.
 */
export async function planFileOp(request: FileOpRequest): Promise<FileOpPlan> {
  const isVisible = createVisibility(request.filters ?? DEFAULT_FILTERS)
  let fileCount = 0
  let dirCount = 0
  let totalBytes = 0
  const overwrites: string[] = []
  const unseen: string[] = []

  for (const item of withoutNested(request.items)) {
    const { full: source } = await confinedPath(rootFor(request, item.from), item.relPath)
    if (!(await lstatOrNull(source))) continue

    if (item.isDir) dirCount++
    else fileCount++

    let entries: WalkEntry[]
    if (request.kind === 'delete') {
      entries = []
      for await (const entry of walk(source, item.relPath, isVisible)) entries.push(entry)
    } else {
      const target = await confinedPath(rootFor(request, otherSide(item.from)), item.relPath)
      const found = await overwritesOf(
        source,
        target.full,
        item.relPath,
        target.realRoot,
        isVisible
      )
      entries = found.entries
      overwrites.push(...found.overwrites.map((overwrite) => overwrite.relPath))
    }

    for (const entry of entries) {
      totalBytes += entry.size
      if (!entry.visible && !entry.isDir) unseen.push(entry.relPath)
    }
  }

  return {
    kind: request.kind,
    fileCount,
    dirCount,
    totalBytes,
    overwrites,
    unseen
  }
}

async function applyOne(request: FileOpRequest, item: FileOpItem, kind: FileOpKind): Promise<void> {
  const { full: source } = await confinedPath(rootFor(request, item.from), item.relPath)

  if (kind === 'delete') {
    // shell.trashItem manda a la Papelera de reciclaje: el borrado es recuperable.
    await shell.trashItem(source)
    return
  }

  const { full: target, realRoot: realTargetRoot } = await confinedPath(
    rootFor(request, otherSide(item.from)),
    item.relPath
  )

  // Lo que se va a pisar va antes a la papelera, con la misma politica que el
  // borrado: una sobrescritura no se puede deshacer, y en una carpeta que se
  // fusiona puede tocar archivos que el usuario no tiene a la vista. Si la
  // papelera falla, el elemento falla entero y no se escribe nada encima.
  const { overwrites } = await overwritesOf(source, target, item.relPath, realTargetRoot)
  for (const overwrite of overwrites) await shell.trashItem(overwrite.target)

  await mkdir(dirname(target), { recursive: true })

  if (kind === 'copy') {
    await cp(source, target, { recursive: true, force: true, preserveTimestamps: true })
    return
  }

  // move: rename es atomico dentro del mismo volumen, pero falla entre discos.
  try {
    await rename(source, target)
  } catch (error) {
    if (!(await mustCopyToMove(error as NodeJS.ErrnoException, target))) throw error
    await cp(source, target, { recursive: true, force: true, preserveTimestamps: true })
    await rm(source, { recursive: true, force: true })
  }
}

/**
 * Si un `rename` fallido se puede sustituir por copiar y borrar el origen.
 *
 * Solo en los dos casos en los que `rename` no puede hacerlo por diseño:
 * entre volumenes (`EXDEV`) y al fusionar una carpeta con otra que ya existe en
 * el destino, que POSIX rechaza con `ENOTEMPTY` o `EEXIST` y Windows con
 * `EPERM`. Cualquier otro fallo se relanza. Antes se copiaba y borraba ante
 * cualquiera, y en Windows un archivo abierto por otro programa hace fallar el
 * `rename` con `EPERM`: se copiaba todo, el borrado se paraba en ese archivo y
 * el origen quedaba a medio borrar, sin pasar por la papelera.
 */
async function mustCopyToMove(error: NodeJS.ErrnoException, target: string): Promise<boolean> {
  if (error.code === 'EXDEV') return true
  if (error.code !== 'ENOTEMPTY' && error.code !== 'EEXIST' && error.code !== 'EPERM') return false
  return (await lstatOrNull(target))?.isDirectory() ?? false
}

export async function runFileOp(
  request: FileOpRequest,
  callbacks: FileOpCallbacks = {}
): Promise<{
  succeeded: number
  failed: { relPath: string; message: string }[]
  cancelled: boolean
}> {
  const failed: { relPath: string; message: string }[] = []
  let succeeded = 0
  let cancelled = false

  // Los padres antes que los hijos: copiar la carpeta ya arrastra su contenido.
  const items = [...request.items].sort((a, b) => a.relPath.length - b.relPath.length)
  const done = new Set<string>()

  for (const [index, item] of items.entries()) {
    if (callbacks.isCancelled?.()) {
      cancelled = true
      break
    }
    // Si ya se proceso una carpeta ancestro, este elemento ya viajo con ella.
    if (hasAncestorIn(item.relPath, done)) continue

    try {
      await applyOne(request, item, request.kind)
      if (item.isDir) done.add(item.relPath)
      succeeded++
    } catch (error) {
      failed.push({ relPath: item.relPath, message: (error as Error).message })
    }
    callbacks.onProgress?.(index + 1, items.length, item.relPath)
  }

  return { succeeded, failed, cancelled }
}
