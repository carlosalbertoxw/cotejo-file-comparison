import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EditorView } from '@codemirror/view'
import type { DiffBlock, Side, TextFilePayload } from '@shared/types'
import { errorText } from '../../i18n/errorMessage'
import { hasPrimaryModifier } from '../../platform'
import { useSettings } from '../../state/settingsStore'
import { useSession } from '../../state/sessionStore'
import { useDiff } from './useDiff'
import { deriveAlignment } from './alignment'
import { DiffPane, type DiffPaneHandle } from './DiffPane'
import { DiffToolbar } from './DiffToolbar'
import { LineGutter } from './LineGutter'
import { MergeGutter } from './MergeGutter'
import { OverviewRuler } from './OverviewRuler'
import { PathBar } from '../common/PathBar'
import { LINE_HEIGHT } from './constants'
import { replaceLines } from './merge'

interface Props {
  tabId: string
  active: boolean
}

interface SideState {
  payload: TextFilePayload | null
  content: string
  error: string | null
}

const EMPTY_SIDE: SideState = { payload: null, content: '', error: null }

export function TextCompareView({ tabId, active }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const tab = useSession((state) => state.tabs.find((item) => item.id === tabId))
  const updateTab = useSession((state) => state.updateTab)
  const diffOptions = useSettings((state) => state.diffOptions)
  const setDiffOption = useSettings((state) => state.setDiffOption)

  const [left, setLeft] = useState<SideState>(EMPTY_SIDE)
  const [right, setRight] = useState<SideState>(EMPTY_SIDE)
  const [readOnly, setReadOnly] = useState(false)
  const [activeBlock, setActiveBlock] = useState(-1)
  const [scroll, setScroll] = useState({ top: 0, left: 0 })
  const [viewport, setViewport] = useState({ height: 0 })

  const leftPane = useRef<DiffPaneHandle>(null)
  const rightPane = useRef<DiffPaneHandle>(null)
  const syncing = useRef(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const hasBoth = left.payload !== null && right.payload !== null
  const { result, pending, error } = useDiff(
    hasBoth ? left.content : null,
    hasBoth ? right.content : null,
    diffOptions
  )

  const rows = result?.rows ?? []
  const blocks = result?.blocks ?? []

  const leftAlignment = useMemo(
    () => (result ? deriveAlignment(result.rows, 'left') : null),
    [result]
  )
  const rightAlignment = useMemo(
    () => (result ? deriveAlignment(result.rows, 'right') : null),
    [result]
  )

  const leftDirty = left.payload !== null && left.content !== left.payload.content
  const rightDirty = right.payload !== null && right.content !== right.payload.content

  useEffect(() => {
    updateTab(tabId, { dirty: leftDirty || rightDirty })
  }, [tabId, leftDirty, rightDirty, updateTab])

  // ----------------------------------------------------------------- cargar

  const loadSide = useCallback(
    async (side: Side, path: string): Promise<void> => {
      const setter = side === 'left' ? setLeft : setRight
      try {
        const payload = await window.api.readTextFile(path)
        setter({ payload, content: payload.content, error: null })
      } catch (loadError) {
        setter({ payload: null, content: '', error: errorText(loadError) })
      }
    },
    []
  )

  const pickSide = useCallback(
    async (side: Side): Promise<void> => {
      const path = await window.api.pickFile(
        t(side === 'left' ? 'textDiff.pickLeftTitle' : 'textDiff.pickRightTitle')
      )
      if (!path) return
      updateTab(tabId, side === 'left' ? { leftPath: path } : { rightPath: path })
      await loadSide(side, path)
    },
    [tabId, updateTab, loadSide, t]
  )

  // Las rutas viven en la pestana; este efecto es quien las convierte en contenido.
  useEffect(() => {
    if (tab?.leftPath && tab.leftPath !== left.payload?.path) void loadSide('left', tab.leftPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.leftPath])

  useEffect(() => {
    if (tab?.rightPath && tab.rightPath !== right.payload?.path) void loadSide('right', tab.rightPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.rightPath])

  const reload = useCallback(async (): Promise<void> => {
    if (tab?.leftPath) await loadSide('left', tab.leftPath)
    if (tab?.rightPath) await loadSide('right', tab.rightPath)
  }, [tab?.leftPath, tab?.rightPath, loadSide])

  const save = useCallback(async (): Promise<void> => {
    for (const [side, state] of [
      ['left', left],
      ['right', right]
    ] as const) {
      if (!state.payload) continue
      if (state.content === state.payload.content) continue
      const { payload } = state
      const info = await window.api.writeTextFile(
        payload.path,
        state.content,
        payload.eol,
        payload.encoding
      )
      const updated: TextFilePayload = { ...payload, content: state.content, ...info }
      if (side === 'left') setLeft((prev) => ({ ...prev, payload: updated }))
      else setRight((prev) => ({ ...prev, payload: updated }))
    }
  }, [left, right])

  // ---------------------------------------------------------------- scroll

  const handleScroll = useCallback((top: number, leftOffset: number): void => {
    if (syncing.current) return
    syncing.current = true
    // Los dos paneles tienen exactamente el mismo alto total (lineas + huecos),
    // asi que igualar scrollTop basta para que las filas queden enfrentadas.
    for (const pane of [leftPane.current, rightPane.current]) {
      const dom = pane?.scrollDOM
      if (!dom) continue
      if (dom.scrollTop !== top) dom.scrollTop = top
      if (dom.scrollLeft !== leftOffset) dom.scrollLeft = leftOffset
    }
    setScroll({ top, left: leftOffset })
    syncing.current = false
  }, [])

  const scrollToRow = useCallback((row: number): void => {
    const dom = leftPane.current?.scrollDOM
    if (!dom) return
    // Un tercio de pantalla por encima: se ve el bloque y algo de contexto.
    const target = Math.max(0, row * LINE_HEIGHT - dom.clientHeight / 3)
    handleScroll(target, dom.scrollLeft)
  }, [handleScroll])

  useEffect(() => {
    const element = bodyRef.current
    if (!element) return
    const observer = new ResizeObserver(() => setViewport({ height: element.clientHeight }))
    observer.observe(element)
    setViewport({ height: element.clientHeight })
    return () => observer.disconnect()
  }, [])

  // Al volver a una pestana oculta, CodeMirror midio 0 px y hay que remedirlo.
  useEffect(() => {
    if (!active) return
    leftPane.current?.view?.requestMeasure()
    rightPane.current?.view?.requestMeasure()
    setViewport({ height: bodyRef.current?.clientHeight ?? 0 })
  }, [active])

  // ------------------------------------------------------------ navegacion

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
    // Sin bloque activo, saltar al primero que quede por debajo de la vista.
    if (activeBlock < 0) {
      const firstRow = Math.floor(scroll.top / LINE_HEIGHT)
      const next = blocks.findIndex((block) => block.startRow >= firstRow)
      goToBlock(next === -1 ? 0 : next)
      return
    }
    goToBlock(Math.min(activeBlock + 1, blocks.length - 1))
  }, [blocks, activeBlock, scroll.top, goToBlock])

  const goPrev = useCallback((): void => {
    if (blocks.length === 0) return
    if (activeBlock < 0) {
      const firstRow = Math.floor(scroll.top / LINE_HEIGHT)
      const candidates = blocks.filter((block) => block.startRow < firstRow)
      goToBlock(candidates.length > 0 ? (candidates[candidates.length - 1] as DiffBlock).index : 0)
      return
    }
    goToBlock(Math.max(activeBlock - 1, 0))
  }, [blocks, activeBlock, scroll.top, goToBlock])

  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'F7') {
        event.preventDefault()
        if (event.shiftKey) goPrev()
        else goNext()
      }
      if (hasPrimaryModifier(event) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, goNext, goPrev, save])

  // ---------------------------------------------------------------- merge

  const merge = useCallback(
    (block: DiffBlock, direction: 'toRight' | 'toLeft'): void => {
      const sourceView: EditorView | null | undefined =
        direction === 'toRight' ? leftPane.current?.view : rightPane.current?.view
      const targetView: EditorView | null | undefined =
        direction === 'toRight' ? rightPane.current?.view : leftPane.current?.view
      if (!sourceView || !targetView) return

      const sourceRange =
        direction === 'toRight'
          ? { start: block.leftStart, end: block.leftEnd }
          : { start: block.rightStart, end: block.rightEnd }
      const targetRange =
        direction === 'toRight'
          ? { start: block.rightStart, end: block.rightEnd }
          : { start: block.leftStart, end: block.leftEnd }

      replaceLines(sourceView, targetView, sourceRange, targetRange)
    },
    []
  )

  // ---------------------------------------------------------------- render

  const contentHeight = rows.length * LINE_HEIGHT
  const loadError = left.error ?? right.error

  return (
    <>
      <PathBar
        kind="file"
        leftPath={tab?.leftPath ?? null}
        rightPath={tab?.rightPath ?? null}
        leftDirty={leftDirty}
        rightDirty={rightDirty}
        onPick={(side) => void pickSide(side)}
        onSetPath={(side, path) =>
          updateTab(tabId, side === 'left' ? { leftPath: path } : { rightPath: path })
        }
      />

      <DiffToolbar
        options={diffOptions}
        onOptionChange={setDiffOption}
        blockCount={blocks.length}
        activeBlock={activeBlock}
        canSave={leftDirty || rightDirty}
        readOnly={readOnly}
        onToggleReadOnly={() => setReadOnly((value) => !value)}
        onPrev={goPrev}
        onNext={goNext}
        onReload={() => void reload()}
        onSave={() => void save()}
      />

      {loadError && <div className="load-error">{loadError}</div>}

      <div className="diff-body" ref={bodyRef}>
        <LineGutter rows={rows} side="left" scrollTop={scroll.top} height={viewport.height} />
        <DiffPane
          ref={leftPane}
          value={left.content}
          alignment={leftAlignment}
          readOnly={readOnly}
          tabSize={diffOptions.tabSize}
          onChange={(value) => setLeft((prev) => ({ ...prev, content: value }))}
          onScroll={handleScroll}
        />

        <MergeGutter
          blocks={blocks}
          scrollTop={scroll.top}
          height={viewport.height}
          activeBlock={activeBlock}
          readOnly={readOnly}
          onMerge={merge}
          onSelectBlock={setActiveBlock}
        />

        <LineGutter rows={rows} side="right" scrollTop={scroll.top} height={viewport.height} />
        <DiffPane
          ref={rightPane}
          value={right.content}
          alignment={rightAlignment}
          readOnly={readOnly}
          tabSize={diffOptions.tabSize}
          onChange={(value) => setRight((prev) => ({ ...prev, content: value }))}
          onScroll={handleScroll}
        />

        <OverviewRuler
          blocks={blocks}
          totalRows={rows.length}
          scrollTop={scroll.top}
          viewportHeight={viewport.height}
          contentHeight={contentHeight}
          onSeek={scrollToRow}
        />
      </div>

      <div className="status-bar">
        {!hasBoth && <span>{t('textDiff.pickBoth')}</span>}
        {hasBoth && result && (
          <>
            <span>
              <span className="swatch changed" />
              {t('textDiff.changed', { count: result.stats.changed })}
            </span>
            <span>
              <span className="swatch orphan" />
              {t('textDiff.onlySides', {
                left: result.stats.leftOnly,
                right: result.stats.rightOnly
              })}
            </span>
            <span>{t('textDiff.equal', { count: result.stats.equal })}</span>
            {result.stats.ignored > 0 && (
              <span>{t('textDiff.ignored', { count: result.stats.ignored })}</span>
            )}
          </>
        )}
        <span className="grow" />
        {result?.inlineSkipped && <span className="warn">{t('textDiff.inlineSkipped')}</span>}
        {error && <span className="warn">{error}</span>}
        {pending && <span>{t('textDiff.comparing')}</span>}
      </div>
    </>
  )
}
