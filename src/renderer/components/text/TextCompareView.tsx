import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EditorView } from '@codemirror/view'
import type { DiffBlock, Side } from '@shared/types'
import { hasPrimaryModifier } from '../../platform'
import { useSettings } from '../../state/settingsStore'
import { useSession } from '../../state/sessionStore'
import { useHistory } from '../../state/historyStore'
import { useDiff } from './useDiff'
import { useSideFile } from './useSideFile'
import { useScrollSync } from './useScrollSync'
import { useBlockNavigation } from './useBlockNavigation'
import { deriveAlignment } from './alignment'
import { DiffPane, type DiffPaneHandle } from './DiffPane'
import { DiffToolbar } from './DiffToolbar'
import { LineGutter } from './LineGutter'
import { MergeGutter } from './MergeGutter'
import { OverviewRuler } from './OverviewRuler'
import { PathBar } from '../common/PathBar'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { LINE_HEIGHT } from './constants'
import { replaceLines, type LineRange } from './merge'
import { mapLineRange } from './selectionMerge'

interface Props {
  tabId: string
  active: boolean
}

/** Que hay seleccionado y en que panel; el lado decide hacia donde se transfiere. */
interface Selection {
  side: Side
  range: LineRange
}

export function TextCompareView({ tabId, active }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const tab = useSession((state) => state.tabs.find((item) => item.id === tabId))
  const updateTab = useSession((state) => state.updateTab)
  const diffOptions = useSettings((state) => state.diffOptions)
  const setDiffOption = useSettings((state) => state.setDiffOption)

  const left = useSideFile()
  const right = useSideFile()

  const [readOnly, setReadOnly] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  /** Lado cuyo guardado choco con un cambio ajeno en el disco. */
  const [conflict, setConflict] = useState<Side | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const leftPane = useRef<DiffPaneHandle>(null)
  const rightPane = useRef<DiffPaneHandle>(null)

  // Se compara lo que hay en los dos paneles, venga de un archivo o lo acabe de
  // escribir o pegar quien compara. Mientras los dos esten vacios no hay nada
  // que comparar y el diff se queda quieto.
  const hasContent = left.content !== '' || right.content !== ''
  const { result, pending, error } = useDiff(
    hasContent ? left.content : null,
    hasContent ? right.content : null,
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

  useEffect(() => {
    updateTab(tabId, { dirty: left.dirty || right.dirty })
  }, [tabId, left.dirty, right.dirty, updateTab])

  // ----------------------------------------------------------------- cargar

  const pickSide = useCallback(
    async (side: Side): Promise<void> => {
      const path = await window.api.pickFile(
        t(side === 'left' ? 'textDiff.pickLeftTitle' : 'textDiff.pickRightTitle')
      )
      if (!path) return
      updateTab(tabId, side === 'left' ? { leftPath: path } : { rightPath: path })
    },
    [tabId, updateTab, t]
  )

  // Las rutas viven en la pestana; estos efectos son quien las convierte en
  // contenido. Dependen solo de la ruta a proposito: recargar en cada cambio
  // del contenido seria un bucle.
  const leftPath = tab?.leftPath ?? null
  const rightPath = tab?.rightPath ?? null
  const leftLoaded = left.payload?.path
  const rightLoaded = right.payload?.path
  const loadLeft = left.load
  const loadRight = right.load

  useEffect(() => {
    if (leftPath && leftPath !== leftLoaded) void loadLeft(leftPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftPath])

  useEffect(() => {
    if (rightPath && rightPath !== rightLoaded) void loadRight(rightPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightPath])

  const reload = useCallback(async (): Promise<void> => {
    setSaveError(null)
    if (leftPath) await loadLeft(leftPath)
    if (rightPath) await loadRight(rightPath)
  }, [leftPath, rightPath, loadLeft, loadRight])

  // ---------------------------------------------------------------- guardar

  const sideOf = useCallback((side: Side) => (side === 'left' ? left : right), [left, right])

  /**
   * Guarda un lado y cuenta lo que paso.
   *
   * Antes esto era un `void saveSide(side)` sin captura: si el archivo era de
   * solo lectura o no habia permisos, la promesa se rechazaba y la interfaz no
   * decia absolutamente nada, con lo que el usuario se quedaba creyendo que
   * habia guardado.
   */
  const saveSide = useCallback(
    async (side: Side, force = false): Promise<void> => {
      const outcome = await sideOf(side).save(force)
      if (outcome.status === 'conflict') {
        setConflict(side)
        return
      }
      if (outcome.status === 'error') {
        setSaveError(outcome.message)
        return
      }
      if (outcome.status === 'saved') setSaveError(null)
    },
    [sideOf]
  )

  const save = useCallback(async (): Promise<void> => {
    await saveSide('left')
    await saveSide('right')
  }, [saveSide])

  // El historial recuerda comparaciones que de verdad se abrieron, no rutas a
  // medio escribir: solo entra lo que se leyo del disco sin error.
  useEffect(() => {
    if (leftLoaded && rightLoaded) useHistory.getState().record('text', leftLoaded, rightLoaded)
  }, [leftLoaded, rightLoaded])

  // ---------------------------------------------------------------- scroll

  const getScrollers = useCallback(
    () => [leftPane.current?.scrollDOM, rightPane.current?.scrollDOM],
    []
  )
  const { scroll, viewport, bodyRef, handleScroll, scrollToRow, remeasure } =
    useScrollSync(getScrollers)

  // Al volver a una pestana oculta, CodeMirror midio 0 px y hay que remedirlo.
  useEffect(() => {
    if (!active) return
    leftPane.current?.view?.requestMeasure()
    rightPane.current?.view?.requestMeasure()
    remeasure()
  }, [active, remeasure])

  // ------------------------------------------------------------ navegacion

  const { activeBlock, setActiveBlock, goNext, goPrev } = useBlockNavigation(
    blocks,
    scroll.top,
    scrollToRow
  )

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

  /**
   * Un lado en solo lectura no se toca ni siquiera desde una transaccion
   * nuestra: `EditorState.readOnly` frena lo que teclea el usuario, pero no un
   * `dispatch`, y el resultado seria un panel modificado que luego no se deja
   * guardar. Mejor no dejar que la edicion llegue a ocurrir.
   */
  const canEdit = useCallback(
    (side: Side): boolean => !readOnly && !(side === 'left' ? left.lossy : right.lossy),
    [readOnly, left.lossy, right.lossy]
  )

  const merge = useCallback(
    (block: DiffBlock, direction: 'toRight' | 'toLeft'): void => {
    if (!canEdit(direction === 'toRight' ? 'right' : 'left')) return

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
    [canEdit]
  )

  /**
   * Guarda la ultima seleccion viva. Un panel avisa con null cuando su
   * seleccion queda vacia, pero eso solo borra el estado si el que avisa es el
   * mismo panel que la tenia: al pinchar en el otro lado, CodeMirror no manda
   * nada por el primero y la seleccion seguiria en pie.
   */
  const handleSelection = useCallback((side: Side, range: LineRange | null): void => {
    setSelection((previous) => {
      if (range) return { side, range }
      return previous?.side === side ? null : previous
    })
  }, [])

  /** Transfiere lo seleccionado al otro lado, sobre las lineas enfrentadas. */
  const transferSelection = useCallback((): void => {
    if (!selection || !result) return
    if (!canEdit(selection.side === 'left' ? 'right' : 'left')) return
    const fromLeft = selection.side === 'left'
    const sourceView = fromLeft ? leftPane.current?.view : rightPane.current?.view
    const targetView = fromLeft ? rightPane.current?.view : leftPane.current?.view
    if (!sourceView || !targetView) return

    const targetRange = mapLineRange(result.rows, selection.side, selection.range)
    replaceLines(sourceView, targetView, selection.range, targetRange)
  }, [selection, result, canEdit])

  // ---------------------------------------------------------------- render

  const contentHeight = rows.length * LINE_HEIGHT
  const loadError = left.error ?? right.error
  // Un archivo que no se pudo decodificar sin perdida no se deja editar: lo que
  // se guardase encima serian los rombos de sustitucion, no su contenido.
  const leftReadOnly = readOnly || left.lossy
  const rightReadOnly = readOnly || right.lossy

  return (
    <>
      <PathBar
        kind="file"
        leftPath={leftPath}
        rightPath={rightPath}
        leftDirty={left.dirty}
        rightDirty={right.dirty}
        onPick={(side) => void pickSide(side)}
        onSetPath={(side, path) =>
          updateTab(tabId, side === 'left' ? { leftPath: path } : { rightPath: path })
        }
        onSave={(side) => void saveSide(side)}
      />

      <DiffToolbar
        options={diffOptions}
        onOptionChange={setDiffOption}
        blockCount={blocks.length}
        activeBlock={activeBlock}
        selectionSide={selection?.side ?? null}
        readOnly={readOnly}
        onToggleReadOnly={() => setReadOnly((value) => !value)}
        onPrev={goPrev}
        onNext={goNext}
        onTransferSelection={transferSelection}
        onReload={() => void reload()}
      />

      {loadError && <div className="load-error">{loadError}</div>}
      {saveError && <div className="load-error">{saveError}</div>}
      {(left.lossy || right.lossy) && (
        <div className="load-error warn-strip">{t('textDiff.lossyEncoding')}</div>
      )}

      <div className="diff-body" ref={bodyRef}>
        <LineGutter rows={rows} side="left" scrollTop={scroll.top} height={viewport.height} />
        <DiffPane
          ref={leftPane}
          value={left.content}
          alignment={leftAlignment}
          readOnly={leftReadOnly}
          tabSize={diffOptions.tabSize}
          onChange={left.setContent}
          onScroll={handleScroll}
          onSelectionChange={(range) => handleSelection('left', range)}
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
          readOnly={rightReadOnly}
          tabSize={diffOptions.tabSize}
          onChange={right.setContent}
          onScroll={handleScroll}
          onSelectionChange={(range) => handleSelection('right', range)}
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
        {!hasContent && <span>{t('textDiff.pickBoth')}</span>}
        {result && (
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
        {selection && (
          <span>
            {t(
              selection.side === 'left'
                ? 'textDiff.selectedLinesLeft'
                : 'textDiff.selectedLinesRight',
              { count: selection.range.end - selection.range.start }
            )}
          </span>
        )}
        {result?.inlineSkipped && <span className="warn">{t('textDiff.inlineSkipped')}</span>}
        {error && <span className="warn">{error}</span>}
        {pending && <span>{t('textDiff.comparing')}</span>}
      </div>

      {conflict && (
        <ConfirmDialog
          title={t('textDiff.conflictTitle')}
          danger
          confirmLabel={t('textDiff.conflictOverwrite')}
          message={<p>{t('textDiff.conflictMessage')}</p>}
          onCancel={() => setConflict(null)}
          onConfirm={() => {
            const side = conflict
            setConflict(null)
            void saveSide(side, true)
          }}
        />
      )}
    </>
  )
}
