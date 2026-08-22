/**
 * Los mismos cuatro idiomas que la aplicación, y por el mismo motivo: quien
 * llega al sitio en francés debería poder descargarse algo que también habla
 * francés.
 *
 * El español es el idioma por defecto y vive en la raíz; los demás cuelgan de
 * su prefijo. `es.ts` es el catálogo fuente y define el tipo, así que a los
 * otros tres les falta una clave y `astro check` lo dice antes de publicar.
 * Es la misma garantía que da el test de paridad de catálogos de la aplicación,
 * pero en tiempo de compilación.
 */

import { es } from './es'
import { en } from './en'
import { fr } from './fr'
import { pt } from './pt'

export const LANGS = ['es', 'en', 'fr', 'pt'] as const

export type Lang = (typeof LANGS)[number]

export const DEFAULT_LANG: Lang = 'es'

/** Catálogos que no son el fuente se declaran con este tipo, y así no se desvían. */
export type Catalog = typeof es

const CATALOGS: Record<Lang, Catalog> = { es, en, fr, pt }

export function getCatalog(lang: Lang): Catalog {
  return CATALOGS[lang]
}

/** Etiqueta BCP 47 para `Intl`: las fechas y los tamaños siguen al idioma. */
export const LOCALE_TAG: Record<Lang, string> = {
  es: 'es-ES',
  en: 'en-US',
  fr: 'fr-FR',
  pt: 'pt-BR'
}

/** Lo que va en `<html lang>` y en `hreflang`. */
export const HTML_LANG: Record<Lang, string> = {
  es: 'es',
  en: 'en',
  fr: 'fr',
  pt: 'pt-BR'
}

export const OG_LOCALE: Record<Lang, string> = {
  es: 'es_ES',
  en: 'en_US',
  fr: 'fr_FR',
  pt: 'pt_BR'
}

/** Endónimos: el nombre de cada idioma no se traduce, igual que en la aplicación. */
export const ENDONYM: Record<Lang, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  pt: 'Português'
}

/** Abreviatura para el selector de la cabecera, donde no cabe el nombre entero. */
export const SHORT_NAME: Record<Lang, string> = {
  es: 'ES',
  en: 'EN',
  fr: 'FR',
  pt: 'PT'
}

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '')

/**
 * Ruta de una página en un idioma. El español no lleva prefijo: es la raíz del
 * sitio, y añadirle `/es/` solo crearía una redirección más que mantener.
 */
export function localePath(lang: Lang, hash = ''): string {
  const prefix = lang === DEFAULT_LANG ? `${BASE}/` : `${BASE}/${lang}/`
  return hash ? `${prefix}${hash}` : prefix
}

/** Ruta de un recurso de `public/`, que es igual para todos los idiomas. */
export function assetPath(file: string): string {
  return `${BASE}/${file}`
}

/**
 * Los identificadores de ancla no se traducen: son los mismos en los cuatro
 * idiomas para que un enlace compartido siga funcionando al cambiar de idioma.
 */
export const SECTIONS = {
  text: 'text',
  folders: 'folders',
  colors: 'colors',
  downloads: 'downloads',
  faq: 'faq'
} as const
