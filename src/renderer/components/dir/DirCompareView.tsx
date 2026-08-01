import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CompareProgress,
  CompareResponse,
  DirNode,
  FileOpItem,
  FileOpKind,
  FileOpPlan,
  Side
} from '@shared/types'
import { useSession } from '../../state/sessionStore'
import { useSettings } from '../../state/settingsStore'
import { PathBar } from '../common/PathBar'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { DirTable, flattenTree, type FlatRow } from './DirTable'
import { DirToolbar } from './DirToolbar'
import { formatSize } from './format'

interface Props {
  tabId: string
  active: boolean
}

interface PendingOp {
  kind: FileOpKind
  from: Side
  items: FileOpItem[]
  plan: FileOpPlan
}

const OP_TITLE: Record<FileOpKind, string> = {
  copy: 'Confirmar copia',
  move: 'Confirmar movimiento',
  delete: 'Confirmar borrado'
}

export function DirCompareView({ tabId, active }: Props): React.JSX.Element {
  const tab = useSession((state) => state.tabs.find((item) => item.id === tabId))
  const updateTab = useSession((state) => state.updateTab)
  const openTab = useSession((state) => state.openTab)

  const compareMode = useSettings((state) => state.compareMode)
  const setCompareMode = useSettings((state) => state.setCompareMode)
  const filters = useSettings((state) => state.filters)
  const setFilters = useSettings((state) => state.setFilters)
  const onlyDifferences = useSettings((state) => state.onlyDifferences)
  const setOnlyDifferences = useSettings((state) => state.setOnlyDifferences)

  const [response, setResponse] = useState<CompareResponse | null>(null)
  const [progress, setProgress] = useState<CompareProgress | null>(null)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingOp, setPendingOp] = useState<PendingOp | null>(null)
  const [opProgress, setOpProgress] = useState<{ done: number; total: number } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const requestIdRef = useRef<string | null>(null)

  // ------------------------------------------------------------- comparar

  const runCompare = useCallback(async (): Promise<void> => {
    if (!tab?.leftPath || !tab?.rightPath) return
    const requestId = crypto.randomUUID()
    requestIdRef.current = requestId
    setRunning(true)
    setMessage(null)
    try {
      const result = await window.api.compareDirectories(requestId, {
        leftRoot: tab.leftPath,
        rightRoot: tab.rightPath,
        mode: compareMode,
        filters
      })
      if (requestIdRef.current !== requestId) return
      setResponse(result)
      setSelected(new Set())
      // Abrir de entrada las carpetas que contienen algo distinto.
      const toExpand = new Set<string>()
      const walk = (node: DirNode): void => {
        for (const child of node.children ?? []) {
          if (!child.isDir) continue
          if (child.status === 'dirDiffers') {
            toExpand.add(child.relPath)
            walk(child)
          }
        }
      }
      walk(result.root)
      setExpanded(toExpand)
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setRunning(false)
      setProgress(null)
    }
  }, [tab?.leftPath, tab?.rightPath, compareMode, filters])

  useEffect(() => {
    return window.api.onCompareProgress((update) => {
      if (update.requestId !== requestIdRef.current) return
      setProgress(update.phase === 'done' ? null : update)
    })
  }, [])

  const pickSide = useCallback(
    async (side: Side): Promise<void> => {
      const path = await window.api.pickDirectory(
        side === 'left' ? 'Carpeta izquierda' : 'Carpeta derecha'
      )
      if (!path) return
      updateTab(tabId, side === 'left' ? { leftPath: path } : { rightPath: path })
    },
    [tabId, updateTab]
  )

  // Comparar en cuanto estan las dos rutas, y de nuevo si cambia el modo.
  useEffect(() => {
    if (tab?.leftPath && tab?.rightPath) void runCompare()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.leftPath, tab?.rightPath, compareMode])

  // --------------------------------------------------------------- filas

  const rows: FlatRow[] = useMemo(
    () => (response ? flattenTree(response.root, expanded, onlyDifferences) : []),
    [response, expanded, onlyDifferences]
  )

  const nodeByPath = useMemo(() => {
    const map = new Map<string, DirNode>()
    const walk = (node: DirNode): void => {
      for (const child of node.children ?? []) {
        map.set(child.relPath, child)
        if (child.isDir) walk(child)
      }
    }
    if (response) walk(response.root)
    return map
  }, [response])

  const toggleExpand = useCallback((relPath: string): void => {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(relPath)) next.delete(relPath)
      else next.add(relPath)
      return next
    })
  }, [])

  const select = useCallback((relPath: string, additive: boolean): void => {
    setSelected((previous) => {
      if (!additive) return new Set([relPath])
      const next = new Set(previous)
      if (next.has(relPath)) next.delete(relPath)
      else next.add(relPath)
      return next
    })
  }, [])

  const openInTextTab = useCallback(
    (node: DirNode): void => {
      if (node.isDir || !tab?.leftPath || !tab?.rightPath) return
      if (!node.left || !node.right) return
      const separator = tab.leftPath.includes('\\') ? '\\' : '/'
      const relative = node.relPath.split('/').join(separator)
      openTab('text', `${tab.leftPath}${separator}${relative}`, `${tab.rightPath}${separator}${relative}`)
    },
    [tab?.leftPath, tab?.rightPath, openTab]
  )

  // --------------------------------------------------- operaciones de archivo

  const requestOp = useCallback(
    async (kind: FileOpKind, from: Side, explicit?: FileOpItem[]): Promise<void> => {
      if (!tab?.leftPath || !tab?.rightPath) return

      const items =
        explicit ??
        [...selected]
          .map((relPath) => nodeByPath.get(relPath))
          .filter((node): node is DirNode => node !== undefined)
          .filter((node) => (from === 'left' ? node.left !== null : node.right !== null))
          .map((node) => ({ relPath: node.relPath, isDir: node.isDir, from }))

      if (items.length === 0) {
        setMessage('No hay nada seleccionado en ese lado.')
        return
      }

      const plan = await window.api.planFileOp({
        operationId: 'plan',
        kind,
        leftRoot: tab.leftPath,
        rightRoot: tab.rightPath,
        items
      })
      setPendingOp({ kind, from, items, plan })
    },
    [tab?.leftPath, tab?.rightPath, selected, nodeByPath]
  )

  const confirmOp = useCallback(async (): Promise<void> => {
    if (!pendingOp || !tab?.leftPath || !tab?.rightPath) return
    const operationId = crypto.randomUUID()
    setPendingOp(null)
    setOpProgress({ done: 0, total: pendingOp.items.length })

    const stop = window.api.onFileOpProgress((update) => {
      if (update.operationId !== operationId) return
      setOpProgress({ done: update.done, total: update.total })
    })

    try {
      const result = await window.api.runFileOp({
        operationId,
        kind: pendingOp.kind,
        leftRoot: tab.leftPath,
        rightRoot: tab.rightPath,
        items: pendingOp.items
      })
      const failures = result.failed.length
      setMessage(
        failures === 0
          ? `${result.succeeded} elementos procesados.`
          : `${result.succeeded} procesados, ${failures} con error: ${result.failed[0]?.message ?? ''}`
      )
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      stop()
      setOpProgress(null)
      await runCompare()
    }
  }, [pendingOp, tab?.leftPath, tab?.rightPath, runCompare])

  /** Sincronizar: llevar a la derecha todo lo que falta o difiere en la izquierda. */
  const syncToRight = useCallback((): void => {
    if (!response) return
    const items: FileOpItem[] = []
    const walk = (node: DirNode): void => {
      for (const child of node.children ?? []) {
        if (child.isDir) {
          if (child.status === 'leftOnly') items.push({ relPath: child.relPath, isDir: true, from: 'left' })
          else walk(child)
          continue
        }
        if (child.status === 'leftOnly' || child.status === 'different') {
          items.push({ relPath: child.relPath, isDir: false, from: 'left' })
        }
      }
    }
    walk(response.root)
    void requestOp('copy', 'left', items)
  }, [response, requestOp])

  // -------------------------------------------------------------- render

  const differenceCount = response
    ? response.stats.different + response.stats.leftOnly + response.stats.rightOnly
    : 0

  return (
    <>
      <PathBar
        kind="directory"
        leftPath={tab?.leftPath ?? null}
        rightPath={tab?.rightPath ?? null}
        onPick={(side) => void pickSide(side)}
        onSetPath={(side, path) =>
          updateTab(tabId, side === 'left' ? { leftPath: path } : { rightPath: path })
        }
      />

      <DirToolbar
        mode={compareMode}
        onModeChange={setCompareMode}
        filters={filters}
        onFiltersChange={setFilters}
        onlyDifferences={onlyDifferences}
        onOnlyDifferencesChange={setOnlyDifferences}
        running={running}
        canCompare={Boolean(tab?.leftPath && tab?.rightPath)}
        hasSelection={selected.size > 0}
        onCompare={() => void runCompare()}
        onCancel={() => {
          if (requestIdRef.current) void window.api.cancelCompare(requestIdRef.current)
        }}
        onCopy={(from) => void requestOp('copy', from)}
        onMove={(from) => void requestOp('move', from)}
        onDelete={(from) => void requestOp('delete', from)}
        onSync={syncToRight}
      />

      {progress && (
        <div className="progress-line">
          <span>{progress.phase === 'scanning' ? 'Explorando' : 'Comparando contenido'}</span>
          <div className="track">
            <div
              className="fill"
              style={{
                width:
                  progress.phase === 'hashing' && progress.total > 0
                    ? `${(progress.hashed / progress.total) * 100}%`
                    : '100%'
              }}
            />
          </div>
          <span className="path">{progress.currentPath}</span>
        </div>
      )}

      {opProgress && (
        <div className="progress-line">
          <span>Procesando archivos</span>
          <div className="track">
            <div
              className="fill"
              style={{ width: `${(opProgress.done / Math.max(1, opProgress.total)) * 100}%` }}
            />
          </div>
          <span>
            {opProgress.done} / {opProgress.total}
          </span>
        </div>
      )}

      {response ? (
        <DirTable
          rows={rows}
          expanded={expanded}
          selected={selected}
          onToggleExpand={toggleExpand}
          onSelect={select}
          onOpen={openInTextTab}
        />
      ) : (
        <div className="empty-state">
          <p>
            {running
              ? 'Comparando…'
              : 'Elige las dos carpetas que quieres comparar.'}
          </p>
        </div>
      )}

      <div className="status-bar">
        {response && (
          <>
            <span>{differenceCount} diferencias</span>
            <span>{response.stats.same} iguales</span>
            <span>
              {response.stats.leftOnly} solo izquierda · {response.stats.rightOnly} solo derecha
            </span>
            {response.errors.length > 0 && (
              <span className="warn" title={response.errors.map((e) => e.relPath).join('\n')}>
                {response.errors.length} rutas ilegibles
              </span>
            )}
          </>
        )}
        <span className="grow" />
        {message && <span>{message}</span>}
        {active && selected.size > 0 && <span>{selected.size} seleccionados</span>}
      </div>

      {pendingOp && (
        <ConfirmDialog
          title={OP_TITLE[pendingOp.kind]}
          danger={pendingOp.kind === 'delete'}
          confirmLabel={pendingOp.kind === 'delete' ? 'Mover a la papelera' : 'Continuar'}
          onCancel={() => setPendingOp(null)}
          onConfirm={() => void confirmOp()}
          message={<OpSummary op={pendingOp} />}
        />
      )}
    </>
  )
}

function OpSummary({ op }: { op: PendingOp }): React.JSX.Element {
  const { plan } = op
  const direction = op.from === 'left' ? 'de izquierda a derecha' : 'de derecha a izquierda'

  return (
    <div>
      <p>
        {plan.fileCount} archivos y {plan.dirCount} carpetas ({formatSize(plan.totalBytes)})
        {op.kind === 'delete' ? ` en el lado ${op.from === 'left' ? 'izquierdo' : 'derecho'}` : ` ${direction}`}
        .
      </p>

      {op.kind === 'delete' ? (
        <p>Se moveran a la Papelera de reciclaje de Windows, asi que podras recuperarlos.</p>
      ) : plan.overwrites.length > 0 ? (
        <>
          <p className="danger">
            Se sobrescribiran {plan.overwrites.length} archivos que ya existen en el destino:
          </p>
          <ul>
            {plan.overwrites.slice(0, 50).map((path) => (
              <li key={path}>{path}</li>
            ))}
            {plan.overwrites.length > 50 && <li>… y {plan.overwrites.length - 50} mas</li>}
          </ul>
        </>
      ) : (
        <p>No se sobrescribe nada: todos los destinos son nuevos.</p>
      )}
    </div>
  )
}
