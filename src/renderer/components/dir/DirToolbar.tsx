import { useState } from 'react'
import type { CompareMode, ScanFilters, Side } from '@shared/types'

interface Props {
  mode: CompareMode
  onModeChange: (mode: CompareMode) => void
  filters: ScanFilters
  onFiltersChange: (filters: ScanFilters) => void
  onlyDifferences: boolean
  onOnlyDifferencesChange: (value: boolean) => void
  running: boolean
  canCompare: boolean
  hasSelection: boolean
  onCompare: () => void
  onCancel: () => void
  onCopy: (from: Side) => void
  onMove: (from: Side) => void
  onDelete: (from: Side) => void
  onSync: () => void
}

const MODE_HELP: Record<CompareMode, string> = {
  quick: 'Compara tamaño y fecha de modificacion. Rapido, pero se fia de la fecha.',
  size: 'Compara solo el tamaño. El mas rapido y el menos fiable.',
  content: 'Lee y hashea los dos archivos. Es el unico modo que no se equivoca.'
}

export function DirToolbar({
  mode,
  onModeChange,
  filters,
  onFiltersChange,
  onlyDifferences,
  onOnlyDifferencesChange,
  running,
  canCompare,
  hasSelection,
  onCompare,
  onCancel,
  onCopy,
  onMove,
  onDelete,
  onSync
}: Props): React.JSX.Element {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <>
      <div className="toolbar">
        <button
          className="primary"
          onClick={running ? onCancel : onCompare}
          disabled={!canCompare && !running}
        >
          {running ? 'Cancelar' : 'Comparar'}
        </button>

        <span className="sep" />

        <label title={MODE_HELP[mode]}>
          Modo
          <select value={mode} onChange={(event) => onModeChange(event.target.value as CompareMode)}>
            <option value="quick">Rapido (tamaño + fecha)</option>
            <option value="size">Solo tamaño</option>
            <option value="content">Contenido (hash)</option>
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={onlyDifferences}
            onChange={(event) => onOnlyDifferencesChange(event.target.checked)}
          />
          Solo diferencias
        </label>

        <button onClick={() => setShowFilters((value) => !value)}>
          Filtros {showFilters ? '▴' : '▾'}
        </button>

        <span className="sep" />

        <button disabled={!hasSelection} onClick={() => onCopy('left')} title="Copiar la seleccion a la derecha">
          Copiar ▶
        </button>
        <button disabled={!hasSelection} onClick={() => onCopy('right')} title="Copiar la seleccion a la izquierda">
          ◀ Copiar
        </button>
        <button disabled={!hasSelection} onClick={() => onMove('left')} title="Mover la seleccion a la derecha">
          Mover ▶
        </button>
        <button disabled={!hasSelection} onClick={() => onMove('right')} title="Mover la seleccion a la izquierda">
          ◀ Mover
        </button>

        <span className="sep" />

        <button disabled={!hasSelection} onClick={() => onDelete('left')} title="Mover a la papelera (lado izquierdo)">
          Borrar izq.
        </button>
        <button disabled={!hasSelection} onClick={() => onDelete('right')} title="Mover a la papelera (lado derecho)">
          Borrar der.
        </button>

        <span className="spacer" />

        <button onClick={onSync} title="Copiar a la derecha todo lo que falta o difiere">
          Sincronizar ▶
        </button>
      </div>

      {showFilters && (
        <div className="toolbar filters">
          <label title="Globs separados por coma. Se aplican a la ruta relativa.">
            Excluir
            <input
              type="text"
              size={40}
              value={filters.exclude.join(', ')}
              onChange={(event) =>
                onFiltersChange({ ...filters, exclude: splitGlobs(event.target.value) })
              }
            />
          </label>
          <label title="Si se rellena, solo se incluyen los archivos que casen.">
            Incluir solo
            <input
              type="text"
              size={30}
              placeholder="**/*.ts, **/*.tsx"
              value={filters.include.join(', ')}
              onChange={(event) =>
                onFiltersChange({ ...filters, include: splitGlobs(event.target.value) })
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.includeHidden}
              onChange={(event) =>
                onFiltersChange({ ...filters, includeHidden: event.target.checked })
              }
            />
            Incluir ocultos
          </label>
          <span className="spacer" />
          <button onClick={onCompare} disabled={!canCompare || running}>
            Aplicar y comparar
          </button>
        </div>
      )}
    </>
  )
}

function splitGlobs(value: string): string[] {
  return value
    .split(',')
    .map((glob) => glob.trim())
    .filter((glob) => glob.length > 0)
}
