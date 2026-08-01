import { opendir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import picomatch from 'picomatch'
import type { EntryStat, ScanFilters } from '@shared/types'

/** Arbol plano: relPath (posix) -> stat. La raiz no aparece. */
export type ScanIndex = Map<string, EntryStat>

export interface ScanResult {
  index: ScanIndex
  errors: { relPath: string; message: string }[]
}

export interface ScanCallbacks {
  onEntry?: (relPath: string) => void
  isCancelled?: () => boolean
}

function buildMatchers(filters: ScanFilters): {
  isExcluded: (relPath: string) => boolean
  isIncluded: (relPath: string) => boolean
} {
  const exclude = filters.exclude.length ? picomatch(filters.exclude, { dot: true }) : null
  const include = filters.include.length ? picomatch(filters.include, { dot: true }) : null
  return {
    isExcluded: (relPath) => (exclude ? exclude(relPath) : false),
    isIncluded: (relPath) => (include ? include(relPath) : true)
  }
}

/**
 * Recorre `root` en anchura y devuelve un indice plano de todas las entradas.
 *
 * Los filtros de exclusion se aplican a las carpetas antes de entrar en ellas,
 * asi que excluir `node_modules` evita tambien el coste de recorrerlo. Los
 * filtros de inclusion solo se aplican a archivos: una carpeta siempre se
 * recorre, porque puede contener archivos que si casan.
 */
export async function scanDirectory(
  root: string,
  filters: ScanFilters,
  callbacks: ScanCallbacks = {}
): Promise<ScanResult> {
  const { isExcluded, isIncluded } = buildMatchers(filters)
  const index: ScanIndex = new Map()
  const errors: { relPath: string; message: string }[] = []

  // Iterativo en vez de recursivo: un arbol muy profundo no debe reventar la pila.
  const queue: string[] = ['']

  while (queue.length > 0) {
    if (callbacks.isCancelled?.()) break
    const currentRel = queue.shift() as string
    const currentAbs = currentRel === '' ? root : join(root, currentRel)

    let dir: Awaited<ReturnType<typeof opendir>>
    try {
      dir = await opendir(currentAbs)
    } catch (error) {
      errors.push({ relPath: currentRel, message: (error as Error).message })
      continue
    }

    try {
      for await (const entry of dir) {
        if (callbacks.isCancelled?.()) break

        if (entry.name.startsWith('.') && !filters.includeHidden) continue

        const relPath = currentRel === '' ? entry.name : `${currentRel}/${entry.name}`
        if (isExcluded(relPath)) continue

        // Los enlaces simbolicos no se siguen: evita ciclos y copias sorpresa.
        if (entry.isSymbolicLink()) continue

        if (entry.isDirectory()) {
          index.set(relPath, { size: 0, mtimeMs: 0, isDir: true })
          queue.push(relPath)
          callbacks.onEntry?.(relPath)
          continue
        }

        if (!entry.isFile()) continue
        if (!isIncluded(relPath)) continue

        try {
          const info = await stat(join(currentAbs, entry.name))
          index.set(relPath, { size: info.size, mtimeMs: info.mtimeMs, isDir: false })
          callbacks.onEntry?.(relPath)
        } catch (error) {
          errors.push({ relPath, message: (error as Error).message })
        }
      }
    } catch (error) {
      errors.push({ relPath: currentRel, message: (error as Error).message })
    }
  }

  return { index, errors }
}
