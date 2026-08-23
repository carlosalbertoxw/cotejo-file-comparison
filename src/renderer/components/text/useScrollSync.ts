import { useCallback, useEffect, useRef, useState } from 'react'
import { LINE_HEIGHT } from './constants'

/**
 * Mantiene los dos paneles cuadrados y mide el alto util.
 *
 * Los dos documentos tienen exactamente el mismo alto total —las filas huecas
 * ocupan su sitio—, asi que igualar `scrollTop` basta para que las lineas
 * queden enfrentadas. El resto de la vista (las canaletas, la regla lateral)
 * se pinta a partir de `scroll` y `viewport`.
 */

export interface ScrollSync {
  scroll: { top: number; left: number }
  viewport: { height: number }
  bodyRef: React.RefObject<HTMLDivElement | null>
  /** Lo llaman los paneles cuando el usuario mueve uno de los dos. */
  handleScroll: (top: number, left: number) => void
  scrollToRow: (row: number) => void
  /** Vuelve a medir; hace falta al mostrar una pestaña que estaba oculta. */
  remeasure: () => void
}

export function useScrollSync(getScrollers: () => (HTMLElement | null | undefined)[]): ScrollSync {
  const [scroll, setScroll] = useState({ top: 0, left: 0 })
  const [viewport, setViewport] = useState({ height: 0 })
  const bodyRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)

  const scrollersRef = useRef(getScrollers)
  scrollersRef.current = getScrollers

  const handleScroll = useCallback((top: number, left: number): void => {
    if (syncing.current) return
    syncing.current = true
    for (const dom of scrollersRef.current()) {
      if (!dom) continue
      if (dom.scrollTop !== top) dom.scrollTop = top
      if (dom.scrollLeft !== left) dom.scrollLeft = left
    }
    setScroll({ top, left })
    syncing.current = false
  }, [])

  const scrollToRow = useCallback(
    (row: number): void => {
      const dom = scrollersRef.current()[0]
      if (!dom) return
      // Un tercio de pantalla por encima: se ve el bloque y algo de contexto.
      const target = Math.max(0, row * LINE_HEIGHT - dom.clientHeight / 3)
      handleScroll(target, dom.scrollLeft)
    },
    [handleScroll]
  )

  const remeasure = useCallback((): void => {
    setViewport({ height: bodyRef.current?.clientHeight ?? 0 })
  }, [])

  useEffect(() => {
    const element = bodyRef.current
    if (!element) return
    const observer = new ResizeObserver(() => setViewport({ height: element.clientHeight }))
    observer.observe(element)
    setViewport({ height: element.clientHeight })
    return () => observer.disconnect()
  }, [])

  return { scroll, viewport, bodyRef, handleScroll, scrollToRow, remeasure }
}
