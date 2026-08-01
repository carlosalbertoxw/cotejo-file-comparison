import { shell } from 'electron'
import { cp, mkdir, rename, rm, stat, readdir } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { FileOpItem, FileOpKind, FileOpPlan, FileOpRequest, Side } from '@shared/types'

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
    throw new Error(`Se esperaba una ruta relativa, no "${relPath}"`)
  }
  const base = resolve(root)
  const full = resolve(base, relPath)
  const rel = relative(base, full)
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`)) {
    throw new Error(`Ruta fuera de la carpeta comparada: "${relPath}"`)
  }
  return full
}

async function sizeOf(fullPath: string): Promise<number> {
  const info = await stat(fullPath)
  if (!info.isDirectory()) return info.size
  let total = 0
  for (const entry of await readdir(fullPath, { withFileTypes: true })) {
    total += await sizeOf(join(fullPath, entry.name))
  }
  return total
}

async function exists(fullPath: string): Promise<boolean> {
  try {
    await stat(fullPath)
    return true
  } catch {
    return false
  }
}

/**
 * Calcula que va a pasar antes de tocar el disco. Lo que devuelve es
 * exactamente lo que se le muestra al usuario en el dialogo de confirmacion.
 */
export async function planFileOp(request: FileOpRequest): Promise<FileOpPlan> {
  let fileCount = 0
  let dirCount = 0
  let totalBytes = 0
  const overwrites: string[] = []
  const affected: string[] = []

  for (const item of request.items) {
    const source = safeJoin(rootFor(request, item.from), item.relPath)
    if (!(await exists(source))) continue

    if (item.isDir) dirCount++
    else fileCount++
    totalBytes += await sizeOf(source)

    if (request.kind === 'delete') {
      affected.push(source)
      continue
    }

    const target = safeJoin(rootFor(request, otherSide(item.from)), item.relPath)
    affected.push(target)
    if (await exists(target)) overwrites.push(item.relPath)
    if (request.kind === 'move') affected.push(source)
  }

  return { kind: request.kind, fileCount, dirCount, totalBytes, overwrites, affected }
}

async function applyOne(request: FileOpRequest, item: FileOpItem, kind: FileOpKind): Promise<void> {
  const source = safeJoin(rootFor(request, item.from), item.relPath)

  if (kind === 'delete') {
    // shell.trashItem manda a la Papelera de reciclaje: el borrado es recuperable.
    await shell.trashItem(source)
    return
  }

  const target = safeJoin(rootFor(request, otherSide(item.from)), item.relPath)
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
): Promise<{ succeeded: number; failed: { relPath: string; message: string }[]; cancelled: boolean }> {
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
