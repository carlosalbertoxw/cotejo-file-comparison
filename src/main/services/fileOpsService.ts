import { shell } from 'electron'
import { cp, lstat, mkdir, readdir, rename, rm } from 'node:fs/promises'
import type { Stats } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
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
 */
async function overwritesOf(
  source: string,
  target: string,
  relPath: string,
  isVisible: ReturnType<typeof createVisibility> = () => true
): Promise<{ overwrites: Overwrite[]; entries: WalkEntry[] }> {
  const overwrites: Overwrite[] = []
  const entries: WalkEntry[] = []
  for await (const entry of walk(source, relPath, isVisible)) {
    entries.push(entry)
    if (entry.isDir) continue
    const destination = join(target, relative(source, entry.fullPath))
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
  const affected: string[] = []

  for (const item of request.items) {
    const source = safeJoin(rootFor(request, item.from), item.relPath)
    if (!(await lstatOrNull(source))) continue

    if (item.isDir) dirCount++
    else fileCount++

    let entries: WalkEntry[]
    if (request.kind === 'delete') {
      entries = []
      for await (const entry of walk(source, item.relPath, isVisible)) entries.push(entry)
      affected.push(source)
    } else {
      const target = safeJoin(rootFor(request, otherSide(item.from)), item.relPath)
      const found = await overwritesOf(source, target, item.relPath, isVisible)
      entries = found.entries
      overwrites.push(...found.overwrites.map((overwrite) => overwrite.relPath))
      affected.push(target)
      if (request.kind === 'move') affected.push(source)
    }

    for (const entry of entries) {
      totalBytes += entry.size
      if (!entry.visible && !entry.isDir) unseen.push(entry.relPath)
    }
  }

  // Si se seleccionan una carpeta y algo de dentro, lo de dentro saldria dos
  // veces: la operacion solo lo procesa una, y el dialogo tiene que decir lo mismo.
  return {
    kind: request.kind,
    fileCount,
    dirCount,
    totalBytes,
    overwrites: [...new Set(overwrites)],
    unseen: [...new Set(unseen)],
    affected
  }
}

async function applyOne(request: FileOpRequest, item: FileOpItem, kind: FileOpKind): Promise<void> {
  const source = safeJoin(rootFor(request, item.from), item.relPath)

  if (kind === 'delete') {
    // shell.trashItem manda a la Papelera de reciclaje: el borrado es recuperable.
    await shell.trashItem(source)
    return
  }

  const target = safeJoin(rootFor(request, otherSide(item.from)), item.relPath)

  // Lo que se va a pisar va antes a la papelera, con la misma politica que el
  // borrado: una sobrescritura no se puede deshacer, y en una carpeta que se
  // fusiona puede tocar archivos que el usuario no tiene a la vista. Si la
  // papelera falla, el elemento falla entero y no se escribe nada encima.
  const { overwrites } = await overwritesOf(source, target, item.relPath)
  for (const overwrite of overwrites) await shell.trashItem(overwrite.target)

  await mkdir(dirname(target), { recursive: true })

  if (kind === 'copy') {
    await cp(source, target, { recursive: true, force: true, preserveTimestamps: true })
    return
  }

  // move: rename es atomico dentro del mismo volumen, pero falla entre discos.
  try {
    await rename(source, target)
  } catch {
    await cp(source, target, { recursive: true, force: true, preserveTimestamps: true })
    await rm(source, { recursive: true, force: true })
  }
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
    if ([...done].some((prefix) => item.relPath.startsWith(`${prefix}/`))) continue

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
