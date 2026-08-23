import { join } from 'node:path'
import type { CompareMode, DirNode, EntryStat, NodeStatus } from '@shared/types'
import type { ScanIndex } from './scanner'
import { hashFile, mapWithConcurrency } from './hasher'

/**
 * Tolerancia al comparar fechas en modo rapido. FAT32 guarda la fecha con
 * granularidad de 2 s, y los .zip tambien, asi que dos copias identicas pueden
 * diferir en hasta 2 s de forma legitima.
 */
const MTIME_TOLERANCE_MS = 2000

/**
 * Cada cuantas entradas se le devuelve el turno al bucle de eventos.
 *
 * Construir el arbol es trabajo sincrono en el proceso principal, que es el
 * mismo que atiende la ventana: con cientos de miles de entradas la aplicacion
 * se quedaba congelada —incluido el boton de cancelar— justo cuando mas ganas
 * hay de pararla. Parando a respirar cada tanto, la interfaz sigue viva y la
 * cancelacion se atiende. El coste es despreciable frente al escaneo.
 */
const YIELD_EVERY = 5_000

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

export interface CompareTreeCallbacks {
  onHashProgress?: (done: number, total: number, relPath: string) => void
  isCancelled?: () => boolean
}

export interface CompareTreeResult {
  root: DirNode
  stats: { same: number; different: number; leftOnly: number; rightOnly: number }
  errors: { relPath: string; message: string }[]
}

function basename(relPath: string): string {
  const slash = relPath.lastIndexOf('/')
  return slash === -1 ? relPath : relPath.slice(slash + 1)
}

function parentOf(relPath: string): string {
  const slash = relPath.lastIndexOf('/')
  return slash === -1 ? '' : relPath.slice(0, slash)
}

/** Compara un par de archivos sin mirar el contenido. */
function compareStats(left: EntryStat, right: EntryStat, mode: CompareMode): NodeStatus {
  if (left.size !== right.size) return 'different'
  if (mode === 'size') return 'same'
  if (mode === 'quick') {
    return Math.abs(left.mtimeMs - right.mtimeMs) <= MTIME_TOLERANCE_MS ? 'same' : 'different'
  }
  // En modo contenido, igualdad de tamano solo significa "candidato a hashear".
  return 'same'
}

/**
 * Fusiona los dos indices planos en un unico arbol con el estado de cada entrada.
 *
 * En modo `content` los archivos con el mismo tamano se hashean en paralelo
 * despues de construir el arbol, y su estado se corrige en sitio.
 */
export async function compareTrees(
  leftRoot: string,
  rightRoot: string,
  leftIndex: ScanIndex,
  rightIndex: ScanIndex,
  mode: CompareMode,
  callbacks: CompareTreeCallbacks = {}
): Promise<CompareTreeResult> {
  const errors: { relPath: string; message: string }[] = []

  // 1. Crear un nodo por cada ruta que exista en cualquiera de los dos lados.
  const nodes = new Map<string, DirNode>()
  const root: DirNode = {
    relPath: '',
    name: '',
    isDir: true,
    left: { size: 0, mtimeMs: 0, isDir: true },
    right: { size: 0, mtimeMs: 0, isDir: true },
    status: 'dirSame',
    children: []
  }
  nodes.set('', root)

  const allPaths = new Set<string>([...leftIndex.keys(), ...rightIndex.keys()])
  // Ordenar por profundidad garantiza que el padre existe antes que el hijo.
  // La profundidad se calcula una vez por ruta y no dentro del comparador, que
  // se llama O(n log n) veces y partia la cadena en cada llamada.
  const depthOf = new Map<string, number>()
  for (const relPath of allPaths) {
    let depth = 0
    for (let i = 0; i < relPath.length; i++) {
      if (relPath.charCodeAt(i) === 47) depth++
    }
    depthOf.set(relPath, depth)
  }
  const sorted = [...allPaths].sort((a, b) => {
    const depth = (depthOf.get(a) as number) - (depthOf.get(b) as number)
    return depth !== 0 ? depth : a.localeCompare(b)
  })

  let sinceYield = 0
  for (const relPath of sorted) {
    if (++sinceYield >= YIELD_EVERY) {
      sinceYield = 0
      await yieldToEventLoop()
      if (callbacks.isCancelled?.()) break
    }

    const left = leftIndex.get(relPath) ?? null
    const right = rightIndex.get(relPath) ?? null
    const isDir = (left ?? right)?.isDir === true

    let status: NodeStatus
    if (left && right) {
      if (left.isDir !== right.isDir) status = 'typeConflict'
      else if (isDir) status = 'dirSame'
      else status = compareStats(left, right, mode)
    } else if (left) {
      status = 'leftOnly'
    } else {
      status = 'rightOnly'
    }

    const node: DirNode = {
      relPath,
      name: basename(relPath),
      isDir,
      left,
      right,
      status,
      ...(isDir ? { children: [] } : {})
    }
    nodes.set(relPath, node)

    const parent = nodes.get(parentOf(relPath))
    // El padre siempre existe: el scanner emite la carpeta antes que su contenido.
    parent?.children?.push(node)
  }

  // 2. Modo contenido: hashear los pares con mismo tamano y corregir su estado.
  if (mode === 'content') {
    const candidates: DirNode[] = []
    for (const node of nodes.values()) {
      if (node.isDir || node.status !== 'same') continue
      // Dos archivos vacios son identicos sin necesidad de leerlos.
      if (node.left?.size === 0) continue
      candidates.push(node)
    }

    let done = 0
    await mapWithConcurrency(candidates, async (node) => {
      if (callbacks.isCancelled?.()) return
      try {
        const [leftHash, rightHash] = await Promise.all([
          hashFile(join(leftRoot, node.relPath)),
          hashFile(join(rightRoot, node.relPath))
        ])
        if (leftHash !== rightHash) node.status = 'different'
      } catch (error) {
        errors.push({ relPath: node.relPath, message: (error as Error).message })
        node.status = 'different'
      } finally {
        done++
        callbacks.onHashProgress?.(done, candidates.length, node.relPath)
      }
    })
  }

  // 3. Propagar el estado de las carpetas de abajo hacia arriba y contar.
  const stats = { same: 0, different: 0, leftOnly: 0, rightOnly: 0 }

  function resolveDir(node: DirNode): void {
    const children = node.children ?? []
    for (const child of children) {
      if (child.isDir) resolveDir(child)
    }

    if (node.status === 'leftOnly' || node.status === 'rightOnly') {
      // Una carpeta huerfana mantiene su estado; sus hijos ya lo heredan visualmente.
      return
    }

    const hasDifference = children.some(
      (child) => child.status !== 'same' && child.status !== 'dirSame'
    )
    node.status = hasDifference ? 'dirDiffers' : 'dirSame'
  }

  resolveDir(root)

  sinceYield = 0
  for (const node of nodes.values()) {
    if (++sinceYield >= YIELD_EVERY) {
      sinceYield = 0
      await yieldToEventLoop()
    }
    if (node.isDir || node.relPath === '') continue
    if (node.status === 'same') stats.same++
    else if (node.status === 'leftOnly') stats.leftOnly++
    else if (node.status === 'rightOnly') stats.rightOnly++
    else stats.different++
  }

  // 4. Ordenar cada nivel: carpetas primero, luego alfabetico (como el explorador).
  function sortChildren(node: DirNode): void {
    if (!node.children) return
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
    for (const child of node.children) sortChildren(child)
  }
  sortChildren(root)

  return { root, stats, errors }
}
