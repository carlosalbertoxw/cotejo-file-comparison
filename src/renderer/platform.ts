/**
 * Diferencias de teclado entre plataformas.
 *
 * En macOS el modificador de los atajos es ⌘ y no Ctrl, asi que comprobar
 * `ctrlKey` a secas deja Cmd+S sin efecto justo donde el usuario mas lo espera.
 */

// `window.api` puede faltar si el preload no cargo; ese caso lo enseña el
// ErrorBoundary, pero este modulo se evalua antes y no puede reventar.
export const IS_MAC = typeof window !== 'undefined' && window.api?.platform === 'darwin'

/** Como se escribe el modificador en los tooltips. */
export const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl'

export function hasPrimaryModifier(event: KeyboardEvent): boolean {
  return IS_MAC ? event.metaKey : event.ctrlKey
}
