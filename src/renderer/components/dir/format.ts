import type { NodeStatus } from '@shared/types'
import i18n from '../../i18n'

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

// Un formatter por idioma: crearlos es caro y la tabla los usa por cada fila.
const numberFormats = new Map<string, Intl.NumberFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()

function numberFormat(fractionDigits: number): Intl.NumberFormat {
  const key = `${i18n.language}:${fractionDigits}`
  let format = numberFormats.get(key)
  if (!format) {
    format = new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    })
    numberFormats.set(key, format)
  }
  return format
}

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return `${numberFormat(unit === 0 ? 0 : 1).format(value)} ${UNITS[unit]}`
}

export function formatDate(mtimeMs: number): string {
  if (!mtimeMs) return ''
  let format = dateFormats.get(i18n.language)
  if (!format) {
    format = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' })
    dateFormats.set(i18n.language, format)
  }
  return format.format(new Date(mtimeMs))
}

/** Simbolo de la columna central, el que se lee de un vistazo. */
export const STATUS_GLYPH: Record<NodeStatus, string> = {
  same: '=',
  dirSame: '=',
  different: '≠',
  dirDiffers: '≠',
  leftOnly: '←',
  rightOnly: '→',
  typeConflict: '!'
}

export const STATUS_LABEL_KEY = {
  same: 'status.same',
  dirSame: 'status.dirSame',
  different: 'status.different',
  dirDiffers: 'status.dirDiffers',
  leftOnly: 'status.leftOnly',
  rightOnly: 'status.rightOnly',
  typeConflict: 'status.typeConflict'
} as const satisfies Record<NodeStatus, string>

export function isDifference(status: NodeStatus): boolean {
  return status !== 'same' && status !== 'dirSame'
}
