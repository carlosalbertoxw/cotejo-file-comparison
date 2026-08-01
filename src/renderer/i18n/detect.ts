export const LANGUAGES = ['es', 'en', 'fr', 'pt'] as const

export type Language = (typeof LANGUAGES)[number]

/** Idioma del sistema si esta soportado; español en caso contrario. */
export function detectLanguage(): Language {
  const primary = navigator.language.split('-')[0] ?? ''
  return (LANGUAGES as readonly string[]).includes(primary) ? (primary as Language) : 'es'
}
