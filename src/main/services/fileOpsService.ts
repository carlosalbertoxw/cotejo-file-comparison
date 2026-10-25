import { shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream, type Stats } from 'node:fs'
import {
  chmod,
  cp,
  lstat,
  mkdir,
  readdir,
  realpath,
  rename,
  rm,
  rmdir,
  stat,
  utimes
} from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import {
  DEFAULT_FILTERS,
  type FileOpItem,
  type FileOpKind,
  type FileOpPlan,
  type FileOpProgress,
  type FileOpRequest,
  type Side
} from '@shared/types'
import { ipcError } from '@shared/ipc-errors'
import { createVisibility } from './scanner'

type OpProgress = Omit<FileOpProgress, 'operationId'>

export interface FileOpCallbacks {
  onProgress?: (progress: OpProgress) => void
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
 * Solo cuenta al borrar, que manda cada carpeta entera a la papelera:
 * seleccionar `docs` y `docs/a.txt` es borrar `docs`, y el archivo va dentro.
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

/**
 * Calcula que va a pasar antes de tocar el disco. Lo que devuelve es
 * exactamente lo que se le muestra al usuario en el dialogo de confirmacion.
 */
export async function planFileOp(request: FileOpRequest): Promise<FileOpPlan> {
  return request.kind === 'delete' ? planDelete(request) : planTransfer(request)
}

/**
 * Un borrado manda cada elemento entero a la papelera, carpetas incluidas, asi
 * que hay que bajar por ellas a contar y a ver que no se veia en la tabla.
 */
async function planDelete(request: FileOpRequest): Promise<FileOpPlan> {
  const isVisible = createVisibility(request.filters ?? DEFAULT_FILTERS)
  let fileCount = 0
  let dirCount = 0
  let totalBytes = 0
  const unseen: string[] = []

  for (const item of withoutNested(request.items)) {
    const { full: source } = await confinedPath(rootFor(request, item.from), item.relPath)
    if (!(await lstatOrNull(source))) continue

    if (item.isDir) dirCount++
    else fileCount++

    for await (const entry of walk(source, item.relPath, isVisible)) {
      totalBytes += entry.size
      if (!entry.visible && !entry.isDir) unseen.push(entry.relPath)
    }
  }

  return { kind: request.kind, fileCount, dirCount, totalBytes, overwrites: [], unseen }
}

/**
 * Una copia o un movimiento llevan solo los elementos que se le piden, uno a
 * uno: una carpeta de la lista se crea en el destino, pero su contenido no
 * viaja con ella; cada cosa de dentro que deba ir llega como elemento propio.
 * Asi lo que la tabla no lista —ocultos, excluidos, o lo igual con «Solo
 * diferencias»— se queda donde estaba, y no hay nada que avisar en `unseen`.
 */
async function planTransfer(request: FileOpRequest): Promise<FileOpPlan> {
  let fileCount = 0
  let dirCount = 0
  let totalBytes = 0
  const overwrites: string[] = []

  for (const item of request.items) {
    const { full: source } = await confinedPath(rootFor(request, item.from), item.relPath)
    const info = await lstatOrNull(source)
    if (!info) continue
    const { full: target } = await confinedPath(
      rootFor(request, otherSide(item.from)),
      item.relPath
    )

    if (info.isDirectory()) {
      dirCount++
      continue
    }
    fileCount++
    totalBytes += info.size
    // Un archivo contra una carpeta no se pisa: el elemento falla y el fallo
    // se cuenta en el resultado, que es lo que tiene que pasar.
    const existing = await lstatOrNull(target)
    if (existing && !existing.isDirectory()) overwrites.push(item.relPath)
  }

  return { kind: request.kind, fileCount, dirCount, totalBytes, overwrites, unseen: [] }
}

export interface FileOpOutcome {
  succeeded: number
  failed: { relPath: string; message: string }[]
  cancelled: boolean
}

export async function runFileOp(
  request: FileOpRequest,
  callbacks: FileOpCallbacks = {}
): Promise<FileOpOutcome> {
  const report = throttledProgress(callbacks.onProgress)
  return request.kind === 'delete'
    ? runDelete(request, callbacks, report)
    : runTransfer(request, callbacks, report)
}

/** Cada cuanto, como mucho, sale un aviso de progreso hacia la ventana. */
const PROGRESS_INTERVAL_MS = 100

type Report = (progress: OpProgress, force?: boolean) => void

/**
 * Un `onProgress` que no se llama mas de una vez cada `PROGRESS_INTERVAL_MS`,
 * salvo que se fuerce. Copiar un archivo de varios gigas da cientos de miles de
 * trozos, y un mensaje IPC por trozo saturaba la ventana que tiene que pintarlos.
 */
function throttledProgress(onProgress: FileOpCallbacks['onProgress']): Report {
  let last = 0
  return (progress, force = false) => {
    if (!onProgress) return
    const now = Date.now()
    if (!force && now - last < PROGRESS_INTERVAL_MS) return
    last = now
    onProgress(progress)
  }
}

/**
 * Borrar es mandar a la papelera, elemento a elemento. No hay nada que preparar
 * ni que deshacer: lo que ya esta en la papelera se recupera desde alli.
 */
async function runDelete(
  request: FileOpRequest,
  callbacks: FileOpCallbacks,
  report: Report
): Promise<FileOpOutcome> {
  const failed: { relPath: string; message: string }[] = []
  let succeeded = 0
  let cancelled = false

  // Los padres antes que los hijos: borrar la carpeta ya arrastra su contenido.
  const items = sortParentsFirst(request.items)
  const done = new Set<string>()

  for (const [index, item] of items.entries()) {
    if (callbacks.isCancelled?.()) {
      cancelled = true
      break
    }
    // Si ya se proceso una carpeta ancestro, este elemento ya viajo con ella.
    if (hasAncestorIn(item.relPath, done)) continue

    report({ phase: 'committing', done: index, total: items.length, currentPath: item.relPath })
    try {
      const { full: source } = await confinedPath(rootFor(request, item.from), item.relPath)
      // shell.trashItem manda a la Papelera de reciclaje: el borrado es recuperable.
      await shell.trashItem(source)
      if (item.isDir) done.add(item.relPath)
      succeeded++
    } catch (error) {
      failed.push({ relPath: item.relPath, message: (error as Error).message })
    }
  }
  report({ phase: 'committing', done: items.length, total: items.length, currentPath: '' }, true)

  return { succeeded, failed, cancelled }
}

function sortParentsFirst(items: FileOpItem[]): FileOpItem[] {
  return [...items].sort((a, b) => a.relPath.length - b.relPath.length)
}

/** Un elemento de una copia o un movimiento, ya resuelto contra el disco. */
interface Transfer {
  item: FileOpItem
  source: string
  target: string
  info: Stats
  /**
   * Si los datos tienen que viajar por la fase de preparacion: siempre al
   * copiar, y al mover solo entre volumenes. Dentro del mismo volumen mover es
   * un `rename`, que no tarda nada y no deja nada a medias.
   */
  staged: boolean
  /** La copia ya completa del origen, junto al destino, esperando su turno. */
  temp: string | null
}

/** La cancelacion, lanzada desde dentro de una copia para cortarla en seco. */
class Cancelled extends Error {}

/**
 * Copiar o mover, en dos fases, para que cancelar no deje nada a medias.
 *
 * Preparar es lo lento y no cambia nada que el usuario ya tuviera: crea las
 * carpetas que falten en el destino y copia cada archivo a un temporal junto a
 * su destino. Se puede cancelar en cualquier momento, incluso a mitad de un
 * archivo grande, y entonces se borra lo preparado y queda todo como estaba.
 *
 * Confirmar es lo rapido: cada archivo pasa a su sitio con un `rename` en la
 * misma carpeta, tras mandar a la papelera lo que pisa. Esa fase ya no se
 * cancela; parar ahi dejaria la operacion a medias, que es justo lo que se
 * quiere evitar.
 */
async function runTransfer(
  request: FileOpRequest,
  callbacks: FileOpCallbacks,
  report: Report
): Promise<FileOpOutcome> {
  const isCancelled = callbacks.isCancelled ?? (() => false)
  const failed: { relPath: string; message: string }[] = []
  const fail = (item: FileOpItem, error: unknown): void => {
    failed.push({ relPath: item.relPath, message: (error as Error).message })
  }

  // Resolver primero, sin tocar nada, para saber cuantos bytes hay que mover y
  // que el porcentaje sea de datos y no de elementos.
  const transfers: Transfer[] = []
  for (const item of sortParentsFirst(request.items)) {
    if (isCancelled()) return { succeeded: 0, failed: [], cancelled: true }
    try {
      transfers.push(await resolveTransfer(request, item))
    } catch (error) {
      fail(item, error)
    }
  }

  // Cada archivo suma uno ademas de sus bytes: asi los vacios tambien avanzan.
  const total = transfers.reduce((sum, t) => sum + (t.staged ? t.info.size + 1 : 0), 0)
  let done = 0
  const created: string[] = []
  const ready: Transfer[] = []

  try {
    for (const transfer of transfers) {
      if (isCancelled()) throw new Cancelled()
      const { item, info } = transfer
      report({ phase: 'staging', done, total, currentPath: item.relPath })
      try {
        if (info.isDirectory()) {
          await ensureDir(transfer.target, created)
        } else {
          await ensureDir(dirname(transfer.target), created)
          if (transfer.staged) {
            transfer.temp = tempPathFor(transfer.target)
            await copyToTemp(transfer, isCancelled, (bytes) => {
              done += bytes
              report({ phase: 'staging', done, total, currentPath: item.relPath })
            })
            done++
          }
        }
        ready.push(transfer)
      } catch (error) {
        if (error instanceof Cancelled) throw error
        await discardTemp(transfer)
        fail(item, error)
      }
    }
  } catch (error) {
    if (!(error instanceof Cancelled)) throw error
    await rollback(transfers, created)
    return { succeeded: 0, failed: [], cancelled: true }
  }
  report({ phase: 'staging', done: total, total, currentPath: '' }, true)

  let succeeded = 0
  for (const [index, transfer] of ready.entries()) {
    report({ phase: 'committing', done: index, total: ready.length, currentPath: transfer.item.relPath })
    try {
      await commitTransfer(transfer, request.kind)
      succeeded++
    } catch (error) {
      await discardTemp(transfer)
      fail(transfer.item, error)
    }
  }

  // Al mover, las carpetas del origen que se han quedado vacias se van con lo
  // que contenian. `rmdir` no borra una carpeta con algo dentro: lo que la
  // tabla no listaba, o lo que fallo, la mantiene en su sitio.
  if (request.kind === 'move') {
    for (const transfer of [...ready].reverse()) {
      if (transfer.info.isDirectory()) await rmdir(transfer.source).catch(() => undefined)
    }
  }
  // Y las que se crearon en el destino solo para alojar un archivo que luego
  // fallo. Las que se pidieron como elemento se quedan aunque esten vacias.
  const requested = new Set(ready.filter((t) => t.info.isDirectory()).map((t) => t.target))
  for (const dir of [...created].reverse()) {
    if (!requested.has(dir)) await rmdir(dir).catch(() => undefined)
  }
  report({ phase: 'committing', done: ready.length, total: ready.length, currentPath: '' }, true)

  return { succeeded, failed, cancelled: false }
}

async function resolveTransfer(request: FileOpRequest, item: FileOpItem): Promise<Transfer> {
  const { full: source } = await confinedPath(rootFor(request, item.from), item.relPath)
  const { full: target } = await confinedPath(
    rootFor(request, otherSide(item.from)),
    item.relPath
  )
  const info = await lstat(source)
  if (info.isDirectory()) return { item, source, target, info, staged: false, temp: null }

  // Mejor fallar aqui que despues de copiar los datos para nada.
  if ((await lstatOrNull(target))?.isDirectory()) {
    throw Object.assign(new Error(`EISDIR: ${target}`), { code: 'EISDIR' })
  }
  const staged = request.kind === 'copy' || (await deviceOf(dirname(target))) !== info.dev
  return { item, source, target, info, staged, temp: null }
}

/**
 * El volumen de una ruta aunque todavia no exista: el de su primer ancestro
 * que si existe, que es donde acabara creada.
 */
async function deviceOf(path: string): Promise<number> {
  try {
    return (await stat(path)).dev
  } catch (error) {
    const parent = dirname(path)
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT' || parent === path) throw error
    return deviceOf(parent)
  }
}

/**
 * `mkdir -p`, apuntando en `created` cada carpeta que crea, de fuera adentro,
 * para poder quitarlas si se cancela.
 */
async function ensureDir(path: string, created: string[]): Promise<void> {
  // A mano y no con `mkdir(path, { recursive: true })`: lo que esa devuelve
  // —la primera carpeta creada— llega en Windows como `\\?\C:\...`, no se
  // puede comparar con `path`, y apuntar de mas aqui acababa quitando al
  // cancelar carpetas vacias que ya existian, como la propia raiz.
  const missing: string[] = []
  for (let dir = path; !(await lstatOrNull(dir)); dir = dirname(dir)) {
    missing.unshift(dir)
    if (dirname(dir) === dir) break
  }
  for (const dir of missing) {
    try {
      await mkdir(dir)
      created.push(dir)
    } catch (error) {
      // Otro la ha creado entretanto: existe, pero no es nuestra.
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
  }
  if (!(await stat(path)).isDirectory()) {
    throw Object.assign(new Error(`ENOTDIR: ${path}`), { code: 'ENOTDIR' })
  }
}

/**
 * Un nombre de temporal en la carpeta del destino. En la misma carpeta, y no
 * en la temporal del sistema, para que el `rename` final no cruce de volumen:
 * asi es instantaneo y el archivo aparece entero o no aparece.
 */
function tempPathFor(target: string): string {
  return join(dirname(target), `.cotejo-${randomUUID().slice(0, 8)}.tmp`)
}

/**
 * Copia el origen al temporal, avisando de cada trozo y cortando en cuanto se
 * cancela. Conserva fechas y permisos, como hacia `cp` con `preserveTimestamps`.
 */
async function copyToTemp(
  transfer: Transfer,
  isCancelled: () => boolean,
  onBytes: (bytes: number) => void
): Promise<void> {
  const { source, info } = transfer
  const temp = transfer.temp as string
  if (!info.isFile()) {
    // Un enlace u otro tipo especial: la tabla no los lista, pero si llegan se
    // copian como lo que son, sin seguirlos.
    await cp(source, temp, { verbatimSymlinks: true, preserveTimestamps: true })
    return
  }
  await pipeline(
    createReadStream(source),
    new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        if (isCancelled()) {
          callback(new Cancelled())
          return
        }
        onBytes(chunk.length)
        callback(null, chunk)
      }
    }),
    // `wx`: si por casualidad el nombre ya existe, se falla en vez de pisarlo.
    createWriteStream(temp, { flags: 'wx' })
  )
  // Las fechas antes que los permisos: en Windows un archivo de solo lectura
  // tampoco deja cambiar sus fechas.
  await utimes(temp, info.atime, info.mtime)
  await chmod(temp, info.mode & 0o7777)
}

/**
 * Coloca un elemento preparado en su sitio. Lo que pisa va antes a la
 * papelera, con la misma politica que el borrado: una sobrescritura no se
 * puede deshacer. Si la papelera falla, el elemento falla y no se escribe nada
 * encima.
 */
async function commitTransfer(transfer: Transfer, kind: FileOpKind): Promise<void> {
  const { source, target, temp, info } = transfer
  if (info.isDirectory()) return

  const existing = await lstatOrNull(target)
  if (existing?.isDirectory()) {
    throw Object.assign(new Error(`EISDIR: ${target}`), { code: 'EISDIR' })
  }
  if (existing) await shell.trashItem(target)

  if (temp) {
    await rename(temp, target)
    transfer.temp = null
    // Recursivo aunque sea un archivo: asi `rm` quita el atributo de solo
    // lectura en Windows antes de borrar, como hacia al mover carpetas.
    if (kind === 'move') await rm(source, { recursive: true, force: true })
    return
  }

  // Mover dentro del mismo volumen. Un `rename` fallido no se sustituye por
  // copiar y borrar salvo con `EXDEV`: en Windows un archivo abierto por otro
  // programa falla con `EPERM`, y ahi lo correcto es no tocar el origen.
  try {
    await rename(source, target)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
    // El volumen parecia el mismo y no lo era (un montaje enlazado, por
    // ejemplo). Ya no se puede cancelar, asi que se copia y se borra aqui.
    await cp(source, target, { force: true, preserveTimestamps: true, verbatimSymlinks: true })
    await rm(source, { recursive: true, force: true })
  }
}

async function discardTemp(transfer: Transfer): Promise<void> {
  if (!transfer.temp) return
  // Con reintentos: en Windows el temporal que se acaba de cortar puede seguir
  // abierto un instante, y borrarlo da `EBUSY`.
  await rm(transfer.temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }).catch(
    () => undefined
  )
  transfer.temp = null
}

/**
 * Deshace la preparacion: borra los temporales y despues las carpetas creadas,
 * de dentro afuera. `rmdir` no borra una carpeta con algo dentro, asi que si
 * alguien ha escrito ahi entretanto, lo suyo se queda.
 */
async function rollback(transfers: Transfer[], created: string[]): Promise<void> {
  for (const transfer of transfers) await discardTemp(transfer)
  for (const dir of [...created].reverse()) await rmdir(dir).catch(() => undefined)
}
