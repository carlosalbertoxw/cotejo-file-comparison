// Contrato compartido entre main, preload y renderer.
// Todo lo que cruza el puente IPC debe ser serializable con structured clone.

export type Side = 'left' | 'right'

// ---------------------------------------------------------------------------
// Diff de texto
// ---------------------------------------------------------------------------

export interface DiffOptions {
  ignoreWhitespace: boolean
  ignoreCase: boolean
  ignoreBlankLines: boolean
  /** Ancho de tabulacion usado al normalizar y al renderizar. */
  tabSize: number
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreBlankLines: false,
  tabSize: 4
}

/**
 * Estado de una fila alineada.
 * - `equal`: las dos lineas son identicas byte a byte.
 * - `ignored`: difieren, pero solo en aspectos que las DiffOptions descartan.
 * - `changed`: par emparejado con diferencias reales.
 * - `leftOnly` / `rightOnly`: huerfano; el otro lado es un hueco.
 */
export type RowStatus = 'equal' | 'ignored' | 'changed' | 'leftOnly' | 'rightOnly'

/** Rango de caracteres [from, to) dentro de una linea, para el resaltado intra-linea. */
export interface InlineRange {
  from: number
  to: number
}

export interface AlignedRow {
  status: RowStatus
  /** Indice 0-based de la linea en el documento izquierdo, o null si es hueco. */
  left: number | null
  right: number | null
  /** Solo en filas `changed`: tramos que difieren dentro de cada linea. */
  leftInline?: InlineRange[]
  rightInline?: InlineRange[]
  /** Indice del bloque de diferencia al que pertenece esta fila, o -1. */
  block: number
}

/** Un grupo contiguo de filas no iguales; es la unidad de navegacion y de merge. */
export interface DiffBlock {
  index: number
  status: 'changed' | 'leftOnly' | 'rightOnly'
  /** Rango de filas [startRow, endRow) dentro de AlignedRow[]. */
  startRow: number
  endRow: number
  /** Rango de lineas [start, end) en cada documento. Vacio si el lado es hueco. */
  leftStart: number
  leftEnd: number
  rightStart: number
  rightEnd: number
}

export interface DiffResult {
  rows: AlignedRow[]
  blocks: DiffBlock[]
  stats: {
    equal: number
    changed: number
    leftOnly: number
    rightOnly: number
    ignored: number
  }
  /** true si se omitio el diff intra-linea por tamano. */
  inlineSkipped: boolean
}

// ---------------------------------------------------------------------------
// Archivos de texto
// ---------------------------------------------------------------------------

export type Eol = 'crlf' | 'lf' | 'mixed'

export interface TextFilePayload {
  path: string
  /** Contenido ya normalizado a LF; `eol` recuerda el original para guardar igual. */
  content: string
  eol: Eol
  encoding: 'utf8' | 'utf8-bom'
  size: number
  mtimeMs: number
  /**
   * El archivo no era UTF-8 valido y al decodificarlo se perdieron bytes.
   * Se puede leer y comparar, pero guardarlo escribiria los rombos de
   * sustitucion encima del contenido original, asi que ese lado va en solo
   * lectura.
   */
  lossy: boolean
}

// ---------------------------------------------------------------------------
// Comparacion de directorios
// ---------------------------------------------------------------------------

export type CompareMode = 'quick' | 'size' | 'content'

export interface ScanFilters {
  /** Globs de exclusion aplicados al path relativo (formato posix). */
  exclude: string[]
  /** Si no esta vacio, solo se incluyen los paths que casen con algun glob. */
  include: string[]
  includeHidden: boolean
}

export const DEFAULT_FILTERS: ScanFilters = {
  exclude: ['**/.git/**', '**/node_modules/**'],
  include: [],
  includeHidden: false
}

export interface EntryStat {
  size: number
  mtimeMs: number
  isDir: boolean
}

export type NodeStatus =
  | 'same'
  | 'different'
  | 'leftOnly'
  | 'rightOnly'
  | 'dirSame'
  | 'dirDiffers'
  /** Ambos lados existen pero uno es archivo y el otro carpeta. */
  | 'typeConflict'

export interface DirNode {
  /** Ruta relativa a la raiz, con separadores posix. Cadena vacia en la raiz. */
  relPath: string
  name: string
  isDir: boolean
  left: EntryStat | null
  right: EntryStat | null
  status: NodeStatus
  /** Solo en carpetas. */
  children?: DirNode[]
}

export interface CompareRequest {
  leftRoot: string
  rightRoot: string
  mode: CompareMode
  filters: ScanFilters
}

export interface CompareProgress {
  requestId: string
  phase: 'scanning' | 'hashing' | 'done'
  scanned: number
  hashed: number
  total: number
  currentPath: string
}

export interface CompareResponse {
  requestId: string
  leftRoot: string
  rightRoot: string
  mode: CompareMode
  root: DirNode
  stats: {
    same: number
    different: number
    leftOnly: number
    rightOnly: number
  }
  /** Rutas que no se pudieron leer (permisos, enlaces rotos). */
  errors: { relPath: string; message: string }[]
}

// ---------------------------------------------------------------------------
// Operaciones de archivo
// ---------------------------------------------------------------------------

export type FileOpKind = 'copy' | 'move' | 'delete'

export interface FileOpItem {
  relPath: string
  isDir: boolean
  /** Lado de origen. En `delete` indica que lado se borra. */
  from: Side
}

export interface FileOpRequest {
  operationId: string
  kind: FileOpKind
  leftRoot: string
  rightRoot: string
  items: FileOpItem[]
  /**
   * Los filtros con los que se escaneo la comparacion. Solo sirven para que el
   * plan diga que parte del contenido de una carpeta no se veia en la tabla;
   * la operacion en si copia, mueve o borra la carpeta entera.
   */
  filters?: ScanFilters
}

/** Resumen calculado antes de ejecutar, para mostrarlo en el dialogo de confirmacion. */
export interface FileOpPlan {
  kind: FileOpKind
  fileCount: number
  dirCount: number
  totalBytes: number
  /**
   * Archivos que ya existen en el destino y seran sobrescritos, uno por uno:
   * si se copia una carpeta que existe en los dos lados, cada archivo de
   * dentro que coincida, no el nombre de la carpeta.
   */
  overwrites: string[]
  /**
   * Archivos que viajan dentro de una carpeta seleccionada pero que la tabla
   * no mostraba: ocultos, excluidos por los filtros o enlaces simbolicos.
   */
  unseen: string[]
}

export interface FileOpProgress {
  operationId: string
  done: number
  total: number
  currentPath: string
}

export interface FileOpResult {
  operationId: string
  succeeded: number
  failed: { relPath: string; message: string }[]
  cancelled: boolean
}

// ---------------------------------------------------------------------------
// Aplicacion
// ---------------------------------------------------------------------------

/**
 * Lo que el proceso principal pregunta antes de cerrar la ventana mientras
 * hay trabajo sin guardar. Los textos los pone el renderer, que es quien sabe
 * en que idioma esta la interfaz.
 */
export interface CloseGuard {
  title: string
  message: string
  detail: string
  discard: string
  cancel: string
}

/** Lo que la pagina «Acerca de» muestra sobre esta copia de Cotejo. */
export interface AppInfo {
  version: string
  electron: string
  chromium: string
  node: string
  platform: string
  arch: string
  /** Donde Cotejo deja datos propios, para ensenarlo en el dialogo Acerca de. */
  paths: AppPaths
}

export interface AppPaths {
  /**
   * Carpeta de datos de Electron. Aqui guarda Chromium el `localStorage` con
   * las preferencias, la sesion, el historial y la ultima comprobacion de
   * versiones, ademas de su propia cache.
   */
  userData: string
  /**
   * Carpeta del registro de errores (`cotejo.log`). En Windows y Linux cuelga
   * de `userData`; en macOS esta en `~/Library/Logs`. El archivo solo existe
   * si alguna vez algo fallo.
   */
  logs: string
  /**
   * Carpeta temporal a la que se descomprime el ejecutable portable (el .exe
   * portable de Windows o la AppImage). `null` si la aplicacion esta instalada.
   */
  portableExtract: string | null
}

export interface UpdateCheck {
  current: string
  /** Etiqueta de la ultima release, o null si el repositorio no tiene ninguna. */
  latest: string | null
  available: boolean
  /** Momento de la consulta, para no repetirla en cada arranque. */
  checkedAt: number
}
