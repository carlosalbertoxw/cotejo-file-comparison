import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DirNode, Side } from '@shared/types'
import { formatDate, formatSize, isDifference, STATUS_GLYPH, STATUS_LABEL_KEY } from './format'

export const ROW_HEIGHT = 20

export interface FlatRow {
  node: DirNode
  depth: number
}

/**
 * Aplana el arbol en la lista de filas realmente visibles, respetando las
 * carpetas colapsadas y el filtro "solo diferencias".
 *
 * Una carpeta sin diferencias se oculta entera bajo ese filtro: si nada dentro
 * cambio, no hay nada que mirar ahi.
 */
export function flattenTree(
  node: DirNode,
  expanded: Set<string>,
  onlyDifferences: boolean,
  depth = 0,
  out: FlatRow[] = []
): FlatRow[] {
  for (const child of node.children ?? []) {
    if (onlyDifferences && !isDifference(child.status)) continue
    out.push({ node: child, depth })
    if (child.isDir && expanded.has(child.relPath)) {
      flattenTree(child, expanded, onlyDifferences, depth + 1, out)
    }
  }
  return out
}

interface Props {
  rows: FlatRow[]
  expanded: Set<string>
  selected: Set<string>
  onToggleExpand: (relPath: string) => void
  onSelect: (relPath: string, additive: boolean) => void
  onOpen: (node: DirNode) => void
}

export function DirTable({
  rows,
  expanded,
  selected,
  onToggleExpand,
  onSelect,
  onOpen
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight] = useState(0)
  /** Fila que tiene el foco del teclado. -1 mientras no se ha usado. */
  const [focused, setFocused] = useState(-1)

  useEffect(() => {
    const element = scrollerRef.current
    if (!element) return
    const observer = new ResizeObserver(() => setHeight(element.clientHeight))
    observer.observe(element)
    setHeight(element.clientHeight)
    return () => observer.disconnect()
  }, [])

  // Una comparacion nueva, o un filtro, cambian las filas bajo los pies.
  useEffect(() => {
    setFocused((current) => (current >= rows.length ? rows.length - 1 : current))
  }, [rows.length])

  /** Mueve el foco y arrastra el scroll lo justo para que la fila se vea. */
  const focusRow = (index: number): void => {
    const clamped = Math.max(0, Math.min(rows.length - 1, index))
    setFocused(clamped)
    const element = scrollerRef.current
    if (!element) return
    const top = clamped * ROW_HEIGHT
    if (top < element.scrollTop) element.scrollTop = top
    else if (top + ROW_HEIGHT > element.scrollTop + element.clientHeight) {
      element.scrollTop = top + ROW_HEIGHT - element.clientHeight
    }
  }

  /**
   * Teclado sobre la tabla. Sin esto la mitad de la aplicacion solo se puede
   * usar con raton: las filas son divs y no habia forma de llegar a ellas.
   */
  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (rows.length === 0) return
    const current = focused < 0 ? 0 : focused
    const row = rows[current]

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusRow(focused < 0 ? 0 : focused + 1)
        return
      case 'ArrowUp':
        event.preventDefault()
        focusRow(focused < 0 ? 0 : focused - 1)
        return
      case 'Home':
        event.preventDefault()
        focusRow(0)
        return
      case 'End':
        event.preventDefault()
        focusRow(rows.length - 1)
        return
      case 'PageDown':
        event.preventDefault()
        focusRow(current + Math.max(1, Math.floor(height / ROW_HEIGHT) - 1))
        return
      case 'PageUp':
        event.preventDefault()
        focusRow(current - Math.max(1, Math.floor(height / ROW_HEIGHT) - 1))
        return
      case 'ArrowRight':
        if (!row?.node.isDir) return
        event.preventDefault()
        if (!expanded.has(row.node.relPath)) onToggleExpand(row.node.relPath)
        else focusRow(current + 1)
        return
      case 'ArrowLeft':
        if (!row?.node.isDir) return
        event.preventDefault()
        if (expanded.has(row.node.relPath)) onToggleExpand(row.node.relPath)
        return
      case ' ':
        if (!row) return
        event.preventDefault()
        onSelect(row.node.relPath, true)
        return
      case 'Enter':
        if (!row) return
        event.preventDefault()
        if (row.node.isDir) onToggleExpand(row.node.relPath)
        else onOpen(row.node)
        return
      default:
    }
  }

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 3)
  const last = Math.min(rows.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + 3)

  const visible: React.JSX.Element[] = []
  for (let index = first; index < last; index++) {
    const row = rows[index]
    if (!row) continue
    const { node, depth } = row
    const canExpand = node.isDir && (node.children?.length ?? 0) > 0

    /**
     * Un lado de la fila. Si la entrada no existe en ese lado se pinta el hueco
     * rayado del comparador de texto: el arbol de enfrente sigue avanzando y
     * aqui no hay nada que enseñar.
     */
    const side = (which: Side): React.JSX.Element => {
      const entry = which === 'left' ? node.left : node.right
      if (!entry) {
        return (
          <>
            <div className="cell name gap" />
            <div className="cell size gap" />
            <div className="cell date gap" />
          </>
        )
      }

      return (
        <>
          <div className="cell name" style={{ paddingLeft: 4 + depth * 14 }}>
            <span
              className={`twisty${canExpand ? '' : ' empty'}`}
              onMouseDown={(event) => {
                event.stopPropagation()
                if (canExpand) onToggleExpand(node.relPath)
              }}
            >
              {canExpand ? (expanded.has(node.relPath) ? '▾' : '▸') : ''}
            </span>
            {/* El icono sale del lado, no del nodo: en un typeConflict uno es
                carpeta y el otro archivo. */}
            <span className="icon">{entry.isDir ? '🗀' : '🗎'}</span>
            <span className="label">{node.name}</span>
          </div>

          <div className="cell size">{entry.isDir ? '' : formatSize(entry.size)}</div>
          <div className="cell date">{entry.isDir ? '' : formatDate(entry.mtimeMs)}</div>
        </>
      )
    }

    const isSelected = selected.has(node.relPath)

    visible.push(
      <div
        key={node.relPath}
        id={`dir-row-${index}`}
        role="row"
        aria-selected={isSelected}
        aria-expanded={canExpand ? expanded.has(node.relPath) : undefined}
        aria-level={depth + 1}
        className={`dir-row status-${node.status}${isSelected ? ' selected' : ''}${
          index === focused ? ' focused' : ''
        }`}
        style={{ top: index * ROW_HEIGHT }}
        onMouseDown={(event) => {
          setFocused(index)
          onSelect(node.relPath, event.ctrlKey || event.metaKey)
        }}
        onDoubleClick={() => (canExpand ? onToggleExpand(node.relPath) : onOpen(node))}
      >
        {side('left')}

        <div className="cell glyph" title={t(STATUS_LABEL_KEY[node.status])}>
          {STATUS_GLYPH[node.status]}
        </div>

        {side('right')}
      </div>
    )
  }

  return (
    <div className="dir-table">
      <div className="dir-header">
        <div className="cell name">{t('dirCompare.colName')}</div>
        <div className="cell size">{t('dirCompare.colSize')}</div>
        <div className="cell date">{t('dirCompare.colModified')}</div>
        <div className="cell glyph" />
        <div className="cell name">{t('dirCompare.colName')}</div>
        <div className="cell size">{t('dirCompare.colSize')}</div>
        <div className="cell date">{t('dirCompare.colModified')}</div>
      </div>
      <div
        className="dir-scroller"
        ref={scrollerRef}
        role="grid"
        aria-label={t('dirCompare.tableLabel')}
        aria-rowcount={rows.length}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused((current) => (current < 0 && rows.length > 0 ? 0 : current))}
        aria-activedescendant={focused >= 0 ? `dir-row-${focused}` : undefined}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div className="dir-canvas" style={{ height: rows.length * ROW_HEIGHT }}>
          {visible}
        </div>
      </div>
    </div>
  )
}
