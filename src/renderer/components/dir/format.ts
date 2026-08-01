import type { NodeStatus } from '@shared/types'

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`
}

export function formatDate(mtimeMs: number): string {
  if (!mtimeMs) return ''
  const date = new Date(mtimeMs)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
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

export const STATUS_LABEL: Record<NodeStatus, string> = {
  same: 'Iguales',
  dirSame: 'Sin diferencias',
  different: 'Distintos',
  dirDiffers: 'Contiene diferencias',
  leftOnly: 'Solo en la izquierda',
  rightOnly: 'Solo en la derecha',
  typeConflict: 'Uno es archivo y el otro carpeta'
}

export function isDifference(status: NodeStatus): boolean {
  return status !== 'same' && status !== 'dirSame'
}
