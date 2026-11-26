import { parseIpcError } from '@shared/ipc-errors'
import i18n from './index'

/**
 * Convierte cualquier error en texto para el usuario: los errores con codigo
 * del proceso main se traducen; el resto (errores del sistema de archivos,
 * por ejemplo) se muestran tal cual.
 */
export function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const payload = parseIpcError(message)
  if (!payload) return message
  // Desde i18next 27, los tipos de `t` ya no aceptan `undefined` como
  // opciones; con un objeto vacio el resultado es el mismo.
  return i18n.t(`errors.${payload.code}`, payload.params ?? {})
}
