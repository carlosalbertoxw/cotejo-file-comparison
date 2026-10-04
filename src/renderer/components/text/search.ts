/**
 * Buscar texto dentro de un panel.
 *
 * Es la caja de «buscar en la pagina» de un navegador: se escribe y se resalta
 * lo que coincide en ese lado. Aqui no hay editor ni React, solo cadenas y
 * posiciones absolutas del documento, para poder probarlo sin montar nada.
 */

export interface SearchOptions {
  matchCase: boolean
  wholeWord: boolean
  /** La consulta es una expresion regular, no texto literal. */
  regex: boolean
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  regex: false
}

/** Una coincidencia, en posiciones absolutas del documento y semiabierta. */
export interface Match {
  from: number
  to: number
}

export interface SearchResult {
  matches: Match[]
  /** Se alcanzo el tope y quedaron coincidencias sin listar. */
  truncated: boolean
  /** La expresion regular no compila: no hay nada que resaltar ni que contar. */
  invalid: boolean
  /** La expresion regular tardaba demasiado y se paro sin terminar. */
  timedOut?: boolean
}

/**
 * Tope de coincidencias.
 *
 * Buscar «e» en un archivo grande son cientos de miles de resaltados; el editor
 * solo pinta los visibles, pero el array y el contador se construyen enteros.
 * Pasado el tope la cuenta se muestra con un «+» y deja de ser exacta, que es
 * mejor que congelar la ventana por un numero que nadie va a leer.
 */
const MAX_MATCHES = 5000

const NOTHING: SearchResult = { matches: [], truncated: false, invalid: false }

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * La expresion con la que se recorre el documento, o null si no compila.
 *
 * Para «palabra completa» no vale `\b`: falla justo cuando la busqueda empieza
 * o acaba en algo que no es letra —`(`, `--`, `.txt`—, porque ahi el limite de
 * palabra no existe y no encontraria nada. Los lookaround miran el caracter
 * vecino de verdad, que es lo que se quiere decir con «completa».
 */
export function buildPattern(query: string, options: SearchOptions): RegExp | null {
  if (query === '') return null
  const source = options.regex ? query : escapeRegExp(query)
  const body = options.wholeWord ? `(?<!\\w)(?:${source})(?!\\w)` : source
  try {
    return new RegExp(body, options.matchCase ? 'g' : 'gi')
  } catch {
    return null
  }
}

export function findMatches(doc: string, query: string, options: SearchOptions): SearchResult {
  if (query === '') return NOTHING
  const pattern = buildPattern(query, options)
  if (!pattern) return { matches: [], truncated: false, invalid: true }

  const matches: Match[] = []
  let truncated = false

  for (let found = pattern.exec(doc); found !== null; found = pattern.exec(doc)) {
    // Una expresion como `a*` casa la cadena vacia en cada posicion: sin
    // avanzar a mano, exec se quedaria clavado en el mismo indice para siempre.
    if (found[0] === '') {
      pattern.lastIndex++
      continue
    }
    matches.push({ from: found.index, to: found.index + found[0].length })
    if (matches.length >= MAX_MATCHES) {
      truncated = true
      break
    }
  }

  return { matches, truncated, invalid: false }
}

/**
 * Primera coincidencia que empieza en `pos` o despues; si no hay ninguna vuelve
 * a la primera, como el buscador del navegador cuando llega al final.
 */
export function indexAtOrAfter(matches: Match[], pos: number): number {
  if (matches.length === 0) return -1
  const index = matches.findIndex((match) => match.from >= pos)
  return index === -1 ? 0 : index
}

/** Indice siguiente (delta 1) o anterior (delta -1), dando la vuelta. */
export function stepIndex(count: number, current: number, delta: number): number {
  if (count === 0) return -1
  return (((current + delta) % count) + count) % count
}
