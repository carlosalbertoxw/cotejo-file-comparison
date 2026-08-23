import { useCallback, useState } from 'react'
import type { DiffBlock } from '@shared/types'
import { LINE_HEIGHT } from './constants'

/**
 * Navegacion entre bloques de diferencia: F7, Shift+F7 y los botones de la
 * barra. Sin bloque activo se salta al primero que caiga fuera de la vista, que
 * es lo que espera quien acaba de hacer scroll a mano.
 */

export interface BlockNavigation {
  activeBlock: number
  setActiveBlock: (index: number) => void
  goToBlock: (index: number) => void
  goNext: () => void
  goPrev: () => void
}

export function useBlockNavigation(
  blocks: DiffBlock[],
  scrollTop: number,
  scrollToRow: (row: number) => void
): BlockNavigation {
  const [activeBlock, setActiveBlock] = useState(-1)

  const goToBlock = useCallback(
    (index: number): void => {
      const block = blocks[index]
      if (!block) return
      setActiveBlock(index)
      scrollToRow(block.startRow)
    },
    [blocks, scrollToRow]
  )

  const goNext = useCallback((): void => {
    if (blocks.length === 0) return
    if (activeBlock < 0) {
      const firstRow = Math.floor(scrollTop / LINE_HEIGHT)
      const next = blocks.findIndex((block) => block.startRow >= firstRow)
      goToBlock(next === -1 ? 0 : next)
      return
    }
    goToBlock(Math.min(activeBlock + 1, blocks.length - 1))
  }, [blocks, activeBlock, scrollTop, goToBlock])

  const goPrev = useCallback((): void => {
    if (blocks.length === 0) return
    if (activeBlock < 0) {
      const firstRow = Math.floor(scrollTop / LINE_HEIGHT)
      const candidates = blocks.filter((block) => block.startRow < firstRow)
      const last = candidates[candidates.length - 1]
      goToBlock(last ? last.index : 0)
      return
    }
    goToBlock(Math.max(activeBlock - 1, 0))
  }, [blocks, activeBlock, scrollTop, goToBlock])

  return { activeBlock, setActiveBlock, goToBlock, goNext, goPrev }
}
