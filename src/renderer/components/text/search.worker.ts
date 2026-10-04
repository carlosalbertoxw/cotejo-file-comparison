import { findMatches, type SearchOptions, type SearchResult } from './search'

export interface SearchRequest {
  doc: string
  query: string
  options: SearchOptions
}

// Una expresion regular la escribe el usuario, y algunas —`(a+)+$` sobre una
// linea larga— tardan minutos en no encontrar nada. Aqui fuera eso no congela
// la ventana, y quien la lanzo puede terminar el worker sin mas.
self.onmessage = (event: MessageEvent<SearchRequest>): void => {
  const { doc, query, options } = event.data
  const result: SearchResult = findMatches(doc, query, options)
  self.postMessage(result)
}
