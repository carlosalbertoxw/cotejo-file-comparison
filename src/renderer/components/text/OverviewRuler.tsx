import { useEffect, useRef } from 'react'
import type { DiffBlock } from '@shared/types'

interface Props {
  blocks: DiffBlock[]
  totalRows: number
  scrollTop: number
  viewportHeight: number
  contentHeight: number
  onSeek: (row: number) => void
}

function readColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'
}

/**
 * Mapa vertical del archivo completo: cada diferencia es una marca, incluso las
 * que quedan a miles de lineas de distancia. Un clic salta a esa zona.
 *
 * Se dibuja en canvas porque un archivo puede tener decenas de miles de bloques
 * y un elemento por bloque ahogaria el DOM.
 */
export function OverviewRuler({
  blocks,
  totalRows,
  scrollTop,
  viewportHeight,
  contentHeight,
  onSeek
}: Props): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    const ratio = window.devicePixelRatio || 1
    const width = parent.clientWidth
    const height = parent.clientHeight
    canvas.width = Math.max(1, Math.round(width * ratio))
    canvas.height = Math.max(1, Math.round(height * ratio))

    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(ratio, ratio)
    context.clearRect(0, 0, width, height)

    if (totalRows > 0) {
      const changedColor = readColor('--diff-inline-bg')
      const orphanColor = readColor('--diff-orphan-text')

      for (const block of blocks) {
        const top = (block.startRow / totalRows) * height
        // Minimo 2 px: una diferencia de una sola linea tiene que verse igual.
        const blockHeight = Math.max(2, ((block.endRow - block.startRow) / totalRows) * height)
        context.fillStyle = block.status === 'changed' ? changedColor : orphanColor
        context.fillRect(1, top, width - 2, blockHeight)
      }
    }

    // Recuadro de la porcion visible ahora mismo.
    if (contentHeight > 0) {
      const top = (scrollTop / contentHeight) * height
      const boxHeight = Math.max(4, (viewportHeight / contentHeight) * height)
      context.strokeStyle = readColor('--border-strong')
      context.lineWidth = 1
      context.strokeRect(0.5, top + 0.5, width - 1, Math.min(boxHeight, height - top) - 1)
    }
  }, [blocks, totalRows, scrollTop, viewportHeight, contentHeight])

  return (
    <div
      className="overview-ruler"
      onMouseDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        const fraction = (event.clientY - bounds.top) / bounds.height
        onSeek(Math.round(fraction * totalRows))
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  )
}
