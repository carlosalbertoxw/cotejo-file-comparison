import { useTranslation } from 'react-i18next'
import type { DiffOptions } from '@shared/types'
import { MOD_LABEL } from '../../platform'

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
      <button onClick={onReload} title={t('textDiff.reloadTooltip')}>
        {t('textDiff.reload')}
      </button>
      <button
        className="primary"
        onClick={onSave}
        disabled={!canSave}
        title={t('textDiff.saveTooltip', { mod: MOD_LABEL })}
      >
        {t('textDiff.save')}
      </button>
    </div>
  )
}
