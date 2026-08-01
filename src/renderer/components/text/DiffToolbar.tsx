import type { DiffOptions } from '@shared/types'

interface Props {
  options: DiffOptions
  onOptionChange: <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) => void
  blockCount: number
  activeBlock: number
  canSave: boolean
  readOnly: boolean
  onToggleReadOnly: () => void
  onPrev: () => void
  onNext: () => void
  onReload: () => void
  onSave: () => void
}

export function DiffToolbar({
  options,
  onOptionChange,
  blockCount,
  activeBlock,
  canSave,
  readOnly,
  onToggleReadOnly,
  onPrev,
  onNext,
  onReload,
  onSave
}: Props): React.JSX.Element {
  return (
    <div className="toolbar">
      <button onClick={onPrev} disabled={blockCount === 0} title="Diferencia anterior (Shift+F7)">
        ▲ Anterior
      </button>
      <button onClick={onNext} disabled={blockCount === 0} title="Diferencia siguiente (F7)">
        ▼ Siguiente
      </button>
      <span className="count">
        {blockCount === 0
          ? 'Sin diferencias'
          : `${activeBlock >= 0 ? activeBlock + 1 : '–'} / ${blockCount}`}
      </span>

      <span className="sep" />

      <label title="Ignora la indentacion y el espaciado interno">
        <input
          type="checkbox"
          checked={options.ignoreWhitespace}
          onChange={(event) => onOptionChange('ignoreWhitespace', event.target.checked)}
        />
        Espacios
      </label>
      <label title="Ignora las diferencias de mayusculas y minusculas">
        <input
          type="checkbox"
          checked={options.ignoreCase}
          onChange={(event) => onOptionChange('ignoreCase', event.target.checked)}
        />
        Mayusculas
      </label>
      <label title="Ignora las lineas en blanco">
        <input
          type="checkbox"
          checked={options.ignoreBlankLines}
          onChange={(event) => onOptionChange('ignoreBlankLines', event.target.checked)}
        />
        Lineas en blanco
      </label>
      <label title="Ancho de tabulacion">
        Tab
        <select
          value={options.tabSize}
          onChange={(event) => onOptionChange('tabSize', Number(event.target.value))}
        >
          <option value={2}>2</option>
          <option value={4}>4</option>
          <option value={8}>8</option>
        </select>
      </label>

      <span className="spacer" />

      <label title="Bloquea la edicion de los dos paneles">
        <input type="checkbox" checked={readOnly} onChange={onToggleReadOnly} />
        Solo lectura
      </label>
      <button onClick={onReload} title="Volver a leer los dos archivos del disco">
        Recargar
      </button>
      <button className="primary" onClick={onSave} disabled={!canSave} title="Guardar (Ctrl+S)">
        Guardar
      </button>
    </div>
  )
}
