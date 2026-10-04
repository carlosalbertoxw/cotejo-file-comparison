import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import {
  DEFAULT_SEARCH_OPTIONS,
  findMatches,
  indexAtOrAfter,
  stepIndex,
  type SearchOptions,
  type SearchResult
} from './search'
import { searchWithRegex } from './regexSearch'
import { setSearchHighlight } from './searchHighlight'
import type { DiffPaneHandle } from './DiffPane'

/**
 * La caja de busqueda de un panel.
 *
 * Cada lado tiene la suya y busca solo en su propio texto: son dos documentos
 * distintos y la coincidencia numero 3 de la izquierda no tiene nada que ver
 * con la numero 3 de la derecha. El hook guarda lo que se busca y donde se
 * esta; la barra solo lo pinta.
 */

const CLOSED: SearchResult = { matches: [], truncated: false, invalid: false }

/**
 * Espera antes de lanzar una busqueda con expresion regular. Cada una arranca
 * un worker, y no tiene sentido hacerlo por cada letra que se teclea.
 */
const REGEX_DEBOUNCE_MS = 150

/** Una seleccion mas larga que esto no es lo que se queria buscar. */
const MAX_SEED_LENGTH = 100

export interface Find {
  open: boolean
  query: string
  options: SearchOptions
  matchCount: number
  /** Cual de todas se esta enseñando, 0-based, o -1 si no hay ninguna. */
  current: number
  truncated: boolean
  invalid: boolean
  /** La expresion regular tardaba demasiado y se paro. */
  timedOut: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  /** Abre la caja, o la reenfoca si ya estaba abierta. */
  show: () => void
  close: () => void
  setQuery: (query: string) => void
  setOption: (key: keyof SearchOptions, value: boolean) => void
  goNext: () => void
  goPrev: () => void
}

export function useFind(
  content: string,
  pane: React.RefObject<DiffPaneHandle | null>
): Find {
  const [open, setOpen] = useState(false)
  const [query, setQueryValue] = useState('')
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS)
  const [current, setCurrent] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  /** Posicion desde la que se busca: el cursor al abrir, luego la coincidencia actual. */
  const anchor = useRef(0)
  /**
   * Hay que llevar la vista a la coincidencia.
   *
   * Solo lo pide quien busca —abrir la caja, teclear, cambiar una opcion—. Si
   * las coincidencias se recalculan porque el usuario esta escribiendo en el
   * panel, la vista se queda donde esta el cursor: saltar a otro sitio a mitad
   * de una frase seria insufrible.
   */
  const pendingReveal = useRef(false)

  /**
   * Un texto literal se busca aqui mismo: escapado no puede desbocarse, y asi
   * el resultado sale en la misma pulsacion. Una expresion regular va a un
   * worker con tiempo limitado, porque una mal escrita congelaria la ventana
   * y, con cambios sin guardar, la unica salida seria matar la aplicacion.
   */
  const viaWorker = open && options.regex && query !== ''

  const literal = useMemo(
    () => (open && !viaWorker ? findMatches(content, query, options) : CLOSED),
    [open, viaWorker, content, query, options]
  )

  const [regexResult, setRegexResult] = useState<SearchResult>(CLOSED)
  useEffect(() => {
    if (!viaWorker) return
    // Mientras llega el resultado nuevo se queda el anterior: vaciarlo haria
    // parpadear el resaltado en cada letra.
    let cancel = (): void => undefined
    let live = true
    const timer = setTimeout(() => {
      const search = searchWithRegex(content, query, options)
      cancel = search.cancel
      void search.result.then((result) => {
        if (live) setRegexResult(result)
      })
    }, REGEX_DEBOUNCE_MS)
    return () => {
      live = false
      clearTimeout(timer)
      cancel()
    }
  }, [viaWorker, content, query, options])

  const { matches, truncated, invalid, timedOut = false } = viaWorker ? regexResult : literal

  const reveal = useCallback(
    (index: number): void => {
      const view = pane.current?.view
      const match = matches[index]
      if (!view || !match) return
      // Basta con mover este panel: el otro lo sigue por la sincronizacion de
      // scroll, que escucha el evento del propio editor.
      view.dispatch({ effects: EditorView.scrollIntoView(match.from, { y: 'center' }) })
    },
    [matches, pane]
  )

  // Cada vez que cambia el conjunto de coincidencias hay que decidir cual es la
  // actual. Se elige por posicion y no por indice: al teclear una letra mas el
  // array entero es otro, pero el sitio del documento donde se estaba mirando
  // sigue siendo el mismo.
  useEffect(() => {
    const index = indexAtOrAfter(matches, anchor.current)
    setCurrent(index)
    const match = matches[index]
    if (match) anchor.current = match.from
    if (pendingReveal.current) {
      pendingReveal.current = false
      reveal(index)
    }
  }, [matches, reveal])

  useEffect(() => {
    pane.current?.view?.dispatch({
      effects: setSearchHighlight.of(open && !invalid && !timedOut ? { matches, current } : null)
    })
  }, [open, invalid, timedOut, matches, current, pane])

  const focusInput = useCallback((): void => {
    inputRef.current?.focus()
    // Como en el navegador: volver a pedir buscar deja escrito lo de antes pero
    // seleccionado, listo para escribir otra cosa encima sin borrar.
    inputRef.current?.select()
  }, [])

  // Al abrir, la caja todavia no existe cuando se pulsa el atajo.
  useEffect(() => {
    if (open) focusInput()
  }, [open, focusInput])

  const show = useCallback((): void => {
    const view = pane.current?.view
    if (view) {
      const range = view.state.selection.main
      anchor.current = range.head
      // Con texto seleccionado en el panel, eso es lo que se quiere buscar.
      // Varias lineas no: eso es una seleccion para transferir, no una palabra.
      const selected = view.state.sliceDoc(range.from, range.to)
      if (selected !== '' && selected.length <= MAX_SEED_LENGTH && !selected.includes('\n')) {
        setQueryValue(selected)
        anchor.current = range.from
      }
    }
    pendingReveal.current = true
    setOpen(true)
    focusInput()
  }, [pane, focusInput])

  const close = useCallback((): void => {
    setOpen(false)
    pane.current?.view?.focus()
  }, [pane])

  const setQuery = useCallback((value: string): void => {
    pendingReveal.current = true
    setQueryValue(value)
  }, [])

  const setOption = useCallback((key: keyof SearchOptions, value: boolean): void => {
    pendingReveal.current = true
    setOptions((previous) => ({ ...previous, [key]: value }))
    // El foco vuelve a la caja: tras marcar «Aa» se sigue escribiendo, y con el
    // foco en el boton el Intro repetiria el boton en vez de buscar.
    inputRef.current?.focus()
  }, [])

  const step = useCallback(
    (delta: number): void => {
      const index = stepIndex(matches.length, current, delta)
      if (index < 0) return
      setCurrent(index)
      const match = matches[index]
      if (match) anchor.current = match.from
      reveal(index)
    },
    [matches, current, reveal]
  )

  const goNext = useCallback((): void => step(1), [step])
  const goPrev = useCallback((): void => step(-1), [step])

  return {
    open,
    query,
    options,
    matchCount: matches.length,
    current,
    truncated,
    invalid,
    timedOut,
    inputRef,
    show,
    close,
    setQuery,
    setOption,
    goNext,
    goPrev
  }
}
