/**
 * Diferencias de teclado entre plataformas.
 *
 * En macOS el modificador de los atajos es ⌘ y no Ctrl, asi que comprobar
 * `ctrlKey` a secas deja Cmd+S sin efecto justo donde el usuario mas lo espera.
 */

// `window.api` puede faltar si el preload no cargo; ese caso lo enseña el
// ErrorBoundary, pero este modulo se evalua antes y no puede reventar. Se lee
// sin el tipo global porque tambien se compila fuera del renderer, donde esa
// declaracion no existe.
const PLATFORM =
  typeof window === 'undefined'
    ? undefined
    : (window as { api?: { platform?: string } }).api?.platform

export const IS_MAC = PLATFORM === 'darwin'

/** Como se escribe el modificador en los tooltips. */
export const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl'

/**
 * Si el sistema de archivos trata igual «Datos.txt» y «datos.txt».
 *
 * Windows y macOS si; Linux no. Se usa para saber si dos rutas apuntan al mismo
 * archivo, no para mostrar nada.
 */
export const PATHS_IGNORE_CASE = IS_MAC || PLATFORM === 'win32'

export function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return IS_MAC ? event.metaKey : event.ctrlKey
}
