// Enlaces publicos de Cotejo. Aqui y en ningun otro sitio: la pagina de
// «Acerca de», el aviso de nueva version y el proceso principal salen todos de
// estas constantes.

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

export const REPO_URL = 'https://github.com/carlosalbertoxw/cotejo-file-comparison'

export const ISSUES_URL = `${REPO_URL}/issues`

/** La API contesta con la ultima release publicada, sin borradores. */
export const LATEST_RELEASE_API =
  'https://api.github.com/repos/carlosalbertoxw/cotejo-file-comparison/releases/latest'

// ---------------------------------------------------------------------------
// Sitio publico
// ---------------------------------------------------------------------------

/**
 * La pagina del proyecto, y el unico sitio al que la aplicacion manda a
 * descargar: presenta los instalables por sistema, con su tamano y lo que hay
 * que saber de cada uno, en vez de la lista cruda de artefactos de una
 * release. Los archivos siguen siendo los de GitHub; lo que cambia es por
 * donde se llega a ellos.
 */
export const SITE_URL = 'https://carlosalbertoxw.com/cotejo-file-comparison'

/**
 * Idiomas que tiene el sitio, que son los mismos que la aplicacion. La lista
 * se repite aqui a proposito: `shared` lo comparten los tres procesos y no
 * puede depender del i18n del renderer. Si algun dia dejan de coincidir, lo
 * peor que pasa es que se abra la pagina en español.
 */
const SITE_LANGUAGES = ['es', 'en', 'fr', 'pt'] as const

/** El idioma por defecto vive en la raiz; los demas, bajo su prefijo. */
export function siteUrl(language: string, hash = ''): string {
  const known = (SITE_LANGUAGES as readonly string[]).includes(language)
  const prefix = !known || language === 'es' ? `${SITE_URL}/` : `${SITE_URL}/${language}/`
  return hash ? `${prefix}#${hash}` : prefix
}

/**
 * Seccion de descargas. El ancla no se traduce en el sitio, justamente para
 * que enlaces como este sigan valiendo en los cuatro idiomas.
 */
export function siteDownloadsUrl(language: string): string {
  return siteUrl(language, 'downloads')
}
