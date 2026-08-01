import type { DiffBlock } from '@shared/types'
import { LINE_HEIGHT } from './constants'

interface Props {
  blocks: DiffBlock[]
  scrollTop: number
  height: number
  activeBlock: number
  readOnly: boolean
  onMerge: (block: DiffBlock, direction: 'toRight' | 'toLeft') => void
  onSelectBlock: (index: number) => void
}

/**
 * Franja central con una flecha por bloque de diferencia.
 *
 * Solo se dibujan los bloques visibles: un archivo con cien mil diferencias no
 * puede meter cien mil botones en el DOM.
 */
export function MergeGutter({
  blocks,
  scrollTop,
  height,
  activeBlock,
  readOnly,
  onMerge,
  onSelectBlock
}: Props): React.JSX.Element {
  const firstRow = Math.floor(scrollTop / LINE_HEIGHT) - 1
  const lastRow = Math.ceil((scrollTop + height) / LINE_HEIGHT) + 1

  return (
    <div className="merge-gutter">
      {blocks.map((block) => {
        if (block.endRow < firstRow || block.startRow > lastRow) return null
        const top = block.startRow * LINE_HEIGHT - scrollTop
        const blockHeight = Math.max(LINE_HEIGHT, (block.endRow - block.startRow) * LINE_HEIGHT)

        return (
          <div
            key={block.index}
            className={`merge-block${block.index === activeBlock ? ' active' : ''}`}
            style={{ top, height: blockHeight }}
            onMouseDown={() => onSelectBlock(block.index)}
          >
            <button
              className="merge-arrow"
              title="Copiar este bloque hacia la derecha"
              disabled={readOnly}
              onClick={(event) => {
                event.stopPropagation()
                onMerge(block, 'toRight')
              }}
            >
              ▶
            </button>
            <button
              className="merge-arrow"
              title="Copiar este bloque hacia la izquierda"
              disabled={readOnly}
              onClick={(event) => {
                event.stopPropagation()
                onMerge(block, 'toLeft')
              }}
            >
              ◀
            </button>
          </div>
        )
      })}
    </div>
  )
}
