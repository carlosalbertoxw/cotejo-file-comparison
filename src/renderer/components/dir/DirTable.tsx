import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DirNode, Side } from '@shared/types'
import { formatDate, formatSize, STATUS_GLYPH, STATUS_LABEL_KEY } from './format'
import { isDifference } from './tree'
import { hasPrimaryModifier } from '../../platform'

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
  /** La tabla decide la seleccion nueva entera: sola, alternando o por rango. */
  onSelectionChange: (selected: Set<string>) => void
  onOpen: (node: DirNode) => void
}

/**
 * Como cambia la seleccion al pinchar o moverse, igual que en un explorador:
 * - `single`: solo esa fila.
 * - `toggle` (Ctrl o ⌘): la añade o la quita, sin tocar las demas.
 * - `range` (Mayus): todas las filas entre el ancla y esta. Con Ctrl ademas,
 *   se suman a lo que ya estaba seleccionado.
 */
type SelectMode = 'single' | 'toggle' | 'range'

export function DirTable({
  rows,
  expanded,
  selected,
  onToggleExpand,
  onSelectionChange,
  onOpen
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [height, setHeight] = useState(0)
  /** Fila que tiene el foco del teclado. -1 mientras no se ha usado. */
  const [focused, setFocused] = useState(-1)
  /**
   * Fila desde la que se extiende un rango con Mayus. Se guarda por ruta y no
   * por indice: desplegar o plegar una carpeta mueve los indices de debajo.
   */
  const anchorRef = useRef<string | null>(null)

  const selectAt = (index: number, mode: SelectMode, keep = false): void => {
    const row = rows[index]
    if (!row) return
    const relPath = row.node.relPath

    if (mode === 'range') {
      const anchor = rows.findIndex((item) => item.node.relPath === anchorRef.current)
      const from = anchor === -1 ? index : anchor
      if (anchor === -1) anchorRef.current = relPath
      const next = keep ? new Set(selected) : new Set<string>()
      for (let i = Math.min(from, index); i <= Math.max(from, index); i++) {
        next.add((rows[i] as FlatRow).node.relPath)
      }
      onSelectionChange(next)
      return
    }

    anchorRef.current = relPath
    if (mode === 'single') {
      onSelectionChange(new Set([relPath]))
      return
    }
    const next = new Set(selected)
    if (next.has(relPath)) next.delete(relPath)
    else next.add(relPath)
    onSelectionChange(next)
  }

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
    const page = Math.max(1, Math.floor(height / ROW_HEIGHT) - 1)

    /** Mover el foco; con Mayus, ademas, extender la seleccion hasta alli. */
    const moveTo = (index: number): void => {
      event.preventDefault()
      const target = Math.max(0, Math.min(rows.length - 1, index))
      focusRow(target)
      if (!event.shiftKey) return
      // Sin ancla todavia, el rango empieza donde estaba el foco.
      if (!rows.some((item) => item.node.relPath === anchorRef.current)) {
        anchorRef.current = rows[current]?.node.relPath ?? null
      }
      selectAt(target, 'range', hasPrimaryModifier(event.nativeEvent))
    }

    if (hasPrimaryModifier(event.nativeEvent) && event.key.toLowerCase() === 'a') {
      event.preventDefault()
      onSelectionChange(new Set(rows.map((item) => item.node.relPath)))
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        moveTo(focused < 0 ? 0 : focused + 1)
        return
      case 'ArrowUp':
        moveTo(focused < 0 ? 0 : focused - 1)
        return
      case 'Home':
        moveTo(0)
        return
      case 'End':
        moveTo(rows.length - 1)
        return
      case 'PageDown':
        moveTo(current + page)
        return
      case 'PageUp':
        moveTo(current - page)
        return
      case 'Escape':
        if (selected.size === 0) return
        event.preventDefault()
        onSelectionChange(new Set())
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
        selectAt(current, event.shiftKey ? 'range' : 'toggle', true)
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
          const toggle = event.ctrlKey || event.metaKey
          if (event.shiftKey) {
            // Sin esto, Mayus+clic ademas selecciona el texto de las filas.
            event.preventDefault()
            selectAt(index, 'range', toggle)
          } else {
            selectAt(index, toggle ? 'toggle' : 'single')
          }
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
