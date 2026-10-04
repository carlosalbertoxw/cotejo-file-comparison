import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EditorView } from '@codemirror/view'
import type { DiffBlock, Side } from '@shared/types'
import { hasPrimaryModifier } from '../../platform'
import { useSettings } from '../../state/settingsStore'
import { useSession } from '../../state/sessionStore'
import { registerTabSaver } from '../../state/tabSavers'
import { useHistory } from '../../state/historyStore'
import { useDiff } from './useDiff'
import { useSideFile } from './useSideFile'
import { useScrollSync } from './useScrollSync'
import { useBlockNavigation } from './useBlockNavigation'
import { useFind, type Find } from './useFind'
import { deriveAlignment } from './alignment'
import { DiffPane, type DiffPaneHandle } from './DiffPane'
import { DiffToolbar } from './DiffToolbar'
import { FindBar } from './FindBar'
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

/** Cargar otro archivo, o releer el mismo, en paneles con trabajo sin guardar. */
interface Replacing {
  /** Los lados que perderian algo. */
  sides: Side[]
  kind: 'replace' | 'reload'
  apply: () => void
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
  /** Un cambio de archivo esperando a que se decida que pasa con lo no guardado. */
  const [replacing, setReplacing] = useState<Replacing | null>(null)

  const leftPane = useRef<DiffPaneHandle>(null)
  const rightPane = useRef<DiffPaneHandle>(null)

  const leftFind = useFind(left.content, leftPane)
  const rightFind = useFind(right.content, rightPane)
  /** Donde se escribio por ultima vez: es el panel al que le toca Ctrl+F. */
  const focusedSide = useRef<Side>('left')
  const findOf = useCallback(
    (side: Side): Find => (side === 'left' ? leftFind : rightFind),
    [leftFind, rightFind]
  )

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

  // Un panel sin archivo con algo escrito no tiene donde guardarse, pero
  // cerrar la pestana lo perderia igual.
  const scratch =
    (left.payload === null && left.content !== '') ||
    (right.payload === null && right.content !== '')

  useEffect(() => {
    updateTab(tabId, { dirty: left.dirty || right.dirty, scratch })
  }, [tabId, left.dirty, right.dirty, scratch, updateTab])

  // ----------------------------------------------------------------- cargar

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
    async (side: Side, force = false): Promise<boolean> => {
      const outcome = await sideOf(side).save(force)
      if (outcome.status === 'conflict') {
        setConflict(side)
        return false
      }
      if (outcome.status === 'error') {
        setSaveError(outcome.message)
        return false
      }
      if (outcome.status === 'saved') setSaveError(null)
      return true
    },
    [sideOf]
  )

  /** `true` si los dos lados quedaron en el disco, o no tenian nada que guardar. */
  const save = useCallback(async (): Promise<boolean> => {
    const leftSaved = await saveSide('left')
    const rightSaved = await saveSide('right')
    return leftSaved && rightSaved
  }, [saveSide])

  // Cerrar la pestana con cambios ofrece guardar, y eso se decide fuera.
  useEffect(() => registerTabSaver(tabId, save), [tabId, save])

  // ---------------------------------------------------- cambiar de archivo

  /** Si sustituir lo que hay en el panel perderia algo. */
  const hasWork = useCallback(
    (side: Side): boolean => {
      const file = sideOf(side)
      return file.dirty || (file.payload === null && file.content !== '')
    },
    [sideOf]
  )

  /**
   * Hace `apply`, que cambia lo cargado en `sides`, preguntando antes si en
   * alguno hay trabajo sin guardar.
   *
   * Antes no se preguntaba: elegir otro archivo, escribir otra ruta o pulsar
   * «Recargar» sustituian el panel por lo que hubiera en el disco, y los
   * cambios se perdian sin aviso. Es la misma pregunta que al cerrar la
   * pestana: guardar y seguir, seguir sin guardar o quedarse como estaba.
   */
  const guard = useCallback(
    (sides: Side[], kind: Replacing['kind'], apply: () => void): void => {
      const atRisk = sides.filter(hasWork)
      if (atRisk.length === 0) apply()
      else setReplacing({ sides: atRisk, kind, apply })
    },
    [hasWork]
  )

  /** Guarda los lados en riesgo que tienen archivo y, si todo llego al disco, sigue. */
  const saveAndApply = useCallback(
    async (pending: Replacing): Promise<void> => {
      setReplacing(null)
      for (const side of pending.sides) {
        // Un panel sin archivo no tiene donde guardarse: lo suyo se pierde
        // igual, y el dialogo ya lo ha dicho.
        if (!sideOf(side).dirty) continue
        // Un conflicto o un error ya se ensenan desde `saveSide`; con ellos
        // no se sigue, que es justo cuando hay algo que no esta a salvo.
        if (!(await saveSide(side))) return
      }
      pending.apply()
    },
    [sideOf, saveSide]
  )

  const setSidePath = useCallback(
    (side: Side, path: string): void =>
      guard([side], 'replace', () =>
        updateTab(tabId, side === 'left' ? { leftPath: path } : { rightPath: path })
      ),
    [guard, tabId, updateTab]
  )

  const pickSide = useCallback(
    async (side: Side): Promise<void> => {
      const path = await window.api.pickFile(
        t(side === 'left' ? 'textDiff.pickLeftTitle' : 'textDiff.pickRightTitle')
      )
      if (path) setSidePath(side, path)
    },
    [setSidePath, t]
  )

  /** Recargar solo toca los lados con ruta: uno sin archivo no tiene que releer. */
  const requestReload = useCallback((): void => {
    const sides: Side[] = []
    if (leftPath) sides.push('left')
    if (rightPath) sides.push('right')
    guard(sides, 'reload', () => void reload())
  }, [guard, leftPath, rightPath, reload])

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
      // Ctrl+F busca en el panel donde se estaba, como haria cualquier editor
      // con dos vistas abiertas; F3 recorre lo encontrado sin volver a la caja.
      if (hasPrimaryModifier(event) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        findOf(focusedSide.current).show()
      }
      if (event.key === 'F3') {
        const find = findOf(focusedSide.current)
        if (!find.open) return
        event.preventDefault()
        if (event.shiftKey) find.goPrev()
        else find.goNext()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active, goNext, goPrev, save, findOf])

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
        onSetPath={setSidePath}
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
        onFind={() => findOf(focusedSide.current).show()}
        onTransferSelection={transferSelection}
        onReload={requestReload}
      />

      {loadError && <div className="load-error">{loadError}</div>}
      {saveError && <div className="load-error">{saveError}</div>}
      {(left.lossy || right.lossy) && (
        <div className="load-error warn-strip">{t('textDiff.lossyEncoding')}</div>
      )}

      <div className="diff-body" ref={bodyRef}>
        <LineGutter rows={rows} side="left" scrollTop={scroll.top} height={viewport.height} />
        {/* El foco y el Escape se escuchan en el envoltorio: asi valen tanto
            desde el editor como desde la caja de busqueda que flota encima. */}
        <div
          className="diff-pane-slot"
          onFocus={() => {
            focusedSide.current = 'left'
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && leftFind.open) leftFind.close()
          }}
        >
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
          {leftFind.open && <FindBar find={leftFind} label={t('textDiff.find.inLeft')} />}
        </div>

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
        <div
          className="diff-pane-slot"
          onFocus={() => {
            focusedSide.current = 'right'
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && rightFind.open) rightFind.close()
          }}
        >
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
          {rightFind.open && <FindBar find={rightFind} label={t('textDiff.find.inRight')} />}
        </div>

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

      {replacing &&
        (replacing.sides.some((side) => sideOf(side).dirty) ? (
          <ConfirmDialog
            title={t('unsaved.replaceTitle')}
            message={
              <p>
                {t(replacing.kind === 'reload' ? 'unsaved.reloadDirty' : 'unsaved.replaceDirty')}
              </p>
            }
            confirmLabel={t('unsaved.saveAndContinue')}
            alternative={{
              label: t('unsaved.discardAndContinue'),
              onClick: () => {
                setReplacing(null)
                replacing.apply()
              }
            }}
            onCancel={() => setReplacing(null)}
            onConfirm={() => void saveAndApply(replacing)}
          />
        ) : (
          // Solo texto suelto: no hay archivo donde guardarlo, asi que la
          // unica salida, aparte de cancelar, es perderlo.
          <ConfirmDialog
            title={t('unsaved.replaceTitle')}
            message={<p>{t('unsaved.replaceScratch')}</p>}
            danger
            confirmLabel={t('unsaved.discardAndContinue')}
            onCancel={() => setReplacing(null)}
            onConfirm={() => {
              setReplacing(null)
              replacing.apply()
            }}
          />
        ))}

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
