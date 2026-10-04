import type { SearchOptions, SearchResult } from './search'
import type { SearchRequest } from './search.worker'

/**
 * Tiempo que se le da a una expresion regular antes de pararla.
 *
 * Una busqueda normal sobre el archivo mas grande que se puede abrir tarda
 * bastante menos; pasado esto lo mas probable es que la expresion haya
 * entrado en retroceso catastrofico y no vaya a terminar nunca.
 */
export const REGEX_BUDGET_MS = 2000

export interface RegexSearch {
  result: Promise<SearchResult>
  cancel: () => void
}

/**
 * Busca con una expresion regular en un worker propio.
 *
 * Un worker por busqueda, y no uno compartido como el del diff: una expresion
 * desbocada no se puede interrumpir desde dentro, solo terminando el worker,
 * y si fuera compartido se llevaria por delante las busquedas de los demas.
 * Arrancarlo cuesta poco al lado de lo que se protege, y solo se hace con la
 * opcion de expresion regular activa.
 */
export function searchWithRegex(doc: string, query: string, options: SearchOptions): RegexSearch {
  const worker = new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' })
  let settle: (result: SearchResult) => void = () => undefined

  const finish = (result: SearchResult): void => {
    clearTimeout(timer)
    worker.terminate()
    settle(result)
  }

  const result = new Promise<SearchResult>((resolve) => {
    settle = resolve
  })

  worker.onmessage = (event: MessageEvent<SearchResult>): void => finish(event.data)
  worker.onerror = (): void => finish({ matches: [], truncated: false, invalid: true })
  const timer = setTimeout(
    () => finish({ matches: [], truncated: false, invalid: false, timedOut: true }),
    REGEX_BUDGET_MS
  )

  const request: SearchRequest = { doc, query, options }
  worker.postMessage(request)

  // Quien cancela ya no escucha; resolver solo evita dejar la promesa colgada.
  return { result, cancel: () => finish({ matches: [], truncated: false, invalid: false }) }
}
