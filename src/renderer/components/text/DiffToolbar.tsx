import { useTranslation } from 'react-i18next'
import type { DiffOptions, Side } from '@shared/types'

interface Props {
  options: DiffOptions
  onOptionChange: <K extends keyof DiffOptions>(key: K, value: DiffOptions[K]) => void
  blockCount: number
  activeBlock: number
  /** Panel que tiene la seleccion, o null si no hay ninguna. */
  selectionSide: Side | null
  readOnly: boolean
  onToggleReadOnly: () => void
  onPrev: () => void
  onNext: () => void
  onTransferSelection: () => void
  onReload: () => void
}

export function DiffToolbar({
  options,
  onOptionChange,
  blockCount,
  activeBlock,
  selectionSide,
  readOnly,
  onToggleReadOnly,
  onPrev,
  onNext,
  onTransferSelection,
  onReload
}: Props): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="toolbar">
      <button onClick={onPrev} disabled={blockCount === 0} title={t('textDiff.prevTooltip')}>
        {t('textDiff.prev')}
      </button>
      <button onClick={onNext} disabled={blockCount === 0} title={t('textDiff.nextTooltip')}>
        {t('textDiff.next')}
      </button>
      <span className="count">
        {blockCount === 0
          ? t('textDiff.noDifferences')
          : `${activeBlock >= 0 ? activeBlock + 1 : '–'} / ${blockCount}`}
      </span>

      <span className="sep" />

      {/* La direccion la marca el panel en el que esta la seleccion: solo se
          puede llevar hacia el otro lado, nunca traer de vuelta. */}
      <button
        onClick={onTransferSelection}
        disabled={readOnly || selectionSide !== 'right'}
        title={t('textDiff.transferLeftTooltip')}
      >
        {t('textDiff.transferLeft')}
      </button>
      <button
        onClick={onTransferSelection}
        disabled={readOnly || selectionSide !== 'left'}
        title={t('textDiff.transferRightTooltip')}
      >
        {t('textDiff.transferRight')}
      </button>

      <span className="sep" />

      <label title={t('textDiff.whitespaceTooltip')}>
        <input
          type="checkbox"
          checked={options.ignoreWhitespace}
          onChange={(event) => onOptionChange('ignoreWhitespace', event.target.checked)}
        />
        {t('textDiff.whitespace')}
      </label>
      <label title={t('textDiff.caseTooltip')}>
        <input
          type="checkbox"
          checked={options.ignoreCase}
          onChange={(event) => onOptionChange('ignoreCase', event.target.checked)}
        />
        {t('textDiff.case')}
      </label>
      <label title={t('textDiff.blankLinesTooltip')}>
        <input
          type="checkbox"
          checked={options.ignoreBlankLines}
          onChange={(event) => onOptionChange('ignoreBlankLines', event.target.checked)}
        />
        {t('textDiff.blankLines')}
      </label>
      <label title={t('textDiff.tabTooltip')}>
        {t('textDiff.tab')}
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

      <label title={t('textDiff.readOnlyTooltip')}>
        <input type="checkbox" checked={readOnly} onChange={onToggleReadOnly} />
        {t('textDiff.readOnly')}
      </label>
      {/* Guardar vive en la barra de rutas, un boton por lado: el archivo que
          se guarda es el de esa ruta y ahi no hay que explicarlo. */}
      <button onClick={onReload} title={t('textDiff.reloadTooltip')}>
        {t('textDiff.reload')}
      </button>
    </div>
  )
}
