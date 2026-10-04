/**
 * Comprobaciones de lo que llega por el puente IPC.
 *
 * Hoy el unico que llama es un renderer nuestro, asi que esto no tapa ningun
 * agujero conocido: es defensa en profundidad. `writeTextFile`, `statPath` y
 * `showItemInFolder` son escritura y lectura arbitrarias de disco, y el dia que
 * algo consiga ejecutar codigo en el renderer —una pagina soltada en la
 * ventana, una dependencia comprometida— la diferencia entre validar aqui y no
 * hacerlo es la diferencia entre un error y un archivo perdido.
 *
 * La disciplina ya existia en el proyecto (`isSafeExternalUrl`, `safeJoin`);
 * lo que faltaba era aplicarla en todos los canales y no solo en dos.
 */

import { ipcError } from '@shared/ipc-errors'
import {
  DEFAULT_FILTERS,
  type CloseGuard,
  type CompareMode,
  type CompareRequest,
  type Eol,
  type FileOpItem,
  type FileOpKind,
  type FileOpRequest,
  type ScanFilters,
  type Side
} from '@shared/types'

function fail(field: string): never {
  throw ipcError('badRequest', { field })
}

export function asString(value: unknown, field: string): string {
  if (typeof value !== 'string') fail(field)
  return value
}

/**
 * Una ruta del sistema de archivos.
 *
 * El byte nulo se rechaza aparte: las llamadas del sistema tratan la cadena
 * como terminada ahi, asi que «a.txt\0.png» abre otro archivo del que parece.
 */
export function asPath(value: unknown, field: string): string {
  const path = asString(value, field)
  if (path === '' || path.includes('\0')) fail(field)
  return path
}

export function asEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) fail(field)
  return value as T
}

export function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') fail(field)
  return value
}

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) fail(field)
  return value.map((item, index) => asString(item, `${field}[${index}]`))
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(field)
  return value as Record<string, unknown>
}

export const EOLS = ['crlf', 'lf', 'mixed'] as const satisfies readonly Eol[]
export const ENCODINGS = ['utf8', 'utf8-bom'] as const
const MODES = ['quick', 'size', 'content'] as const satisfies readonly CompareMode[]
const KINDS = ['copy', 'move', 'delete'] as const satisfies readonly FileOpKind[]
const SIDES = ['left', 'right'] as const satisfies readonly Side[]

/** Los globs viven en un `picomatch`; una lista desmedida solo gasta tiempo. */
const MAX_GLOBS = 200

function asFilters(value: unknown, field: string): ScanFilters {
  if (value === undefined) return DEFAULT_FILTERS
  const raw = asRecord(value, field)
  const exclude = asStringArray(raw.exclude, `${field}.exclude`)
  const include = asStringArray(raw.include, `${field}.include`)
  if (exclude.length > MAX_GLOBS || include.length > MAX_GLOBS) fail(field)
  return {
    exclude,
    include,
    includeHidden: asBoolean(raw.includeHidden, `${field}.includeHidden`)
  }
}

export function asCompareRequest(value: unknown): CompareRequest {
  const raw = asRecord(value, 'request')
  return {
    leftRoot: asPath(raw.leftRoot, 'request.leftRoot'),
    rightRoot: asPath(raw.rightRoot, 'request.rightRoot'),
    mode: asEnum(raw.mode, MODES, 'request.mode'),
    filters: asFilters(raw.filters, 'request.filters')
  }
}

/**
 * Tope de elementos de una operacion. Es holgado para lo que cabe en la tabla,
 * y evita que un mensaje mal formado ponga al proceso principal a recorrer una
 * lista sin fin antes de tocar el disco.
 */
const MAX_ITEMS = 100_000

function asFileOpItem(value: unknown, field: string): FileOpItem {
  const raw = asRecord(value, field)
  const relPath = asString(raw.relPath, `${field}.relPath`)
  // La defensa de verdad contra el escape de la raiz es `safeJoin`, en el
  // servicio. Aqui solo se descarta lo que ni siquiera es una ruta.
  if (relPath === '' || relPath.includes('\0')) fail(`${field}.relPath`)
  return {
    relPath,
    isDir: asBoolean(raw.isDir, `${field}.isDir`),
    from: asEnum(raw.from, SIDES, `${field}.from`)
  }
}

export function asFileOpRequest(value: unknown): FileOpRequest {
  const raw = asRecord(value, 'request')
  if (!Array.isArray(raw.items)) fail('request.items')
  if (raw.items.length > MAX_ITEMS) fail('request.items')
  return {
    operationId: asString(raw.operationId, 'request.operationId'),
    kind: asEnum(raw.kind, KINDS, 'request.kind'),
    leftRoot: asPath(raw.leftRoot, 'request.leftRoot'),
    rightRoot: asPath(raw.rightRoot, 'request.rightRoot'),
    items: raw.items.map((item, index) => asFileOpItem(item, `request.items[${index}]`)),
    filters: asFilters(raw.filters, 'request.filters')
  }
}

/** Estado esperado del archivo al guardar. Opcional: sin el no se comprueba. */
export function asExpectedState(
  value: unknown,
  field: string
): { mtimeMs: number; size: number } | undefined {
  if (value === undefined || value === null) return undefined
  const raw = asRecord(value, field)
  if (typeof raw.mtimeMs !== 'number' || !Number.isFinite(raw.mtimeMs)) fail(`${field}.mtimeMs`)
  if (typeof raw.size !== 'number' || !Number.isFinite(raw.size)) fail(`${field}.size`)
  return { mtimeMs: raw.mtimeMs, size: raw.size }
}

/** Un texto de dialogo tiene que caber en un dialogo. */
const MAX_DIALOG_TEXT = 1000

function asDialogText(value: unknown, field: string): string {
  const text = asString(value, field)
  if (text.length > MAX_DIALOG_TEXT) fail(field)
  return text
}

/** Los textos del aviso al cerrar, o `null` si no hay nada sin guardar. */
export function asCloseGuard(value: unknown): CloseGuard | null {
  if (value === null) return null
  const raw = asRecord(value, 'guard')
  return {
    title: asDialogText(raw.title, 'guard.title'),
    message: asDialogText(raw.message, 'guard.message'),
    detail: asDialogText(raw.detail, 'guard.detail'),
    discard: asDialogText(raw.discard, 'guard.discard'),
    cancel: asDialogText(raw.cancel, 'guard.cancel')
  }
}
