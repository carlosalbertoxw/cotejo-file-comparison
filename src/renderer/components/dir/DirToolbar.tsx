import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const MODE_HELP_KEY = {
  quick: 'dirCompare.modeHelpQuick',
  size: 'dirCompare.modeHelpSize',
  content: 'dirCompare.modeHelpContent'
} as const satisfies Record<CompareMode, string>

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
  const { t } = useTranslation()
  const [showFilters, setShowFilters] = useState(false)

  return (
    <>
      <div className="toolbar">
        <button
          className="primary"
          onClick={running ? onCancel : onCompare}
          disabled={!canCompare && !running}
        >
          {running ? t('dirCompare.cancel') : t('dirCompare.compare')}
        </button>

        <span className="sep" />

        <label title={t(MODE_HELP_KEY[mode])}>
          {t('dirCompare.mode')}
          <select value={mode} onChange={(event) => onModeChange(event.target.value as CompareMode)}>
            <option value="quick">{t('dirCompare.modeQuick')}</option>
            <option value="size">{t('dirCompare.modeSize')}</option>
            <option value="content">{t('dirCompare.modeContent')}</option>
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={onlyDifferences}
            onChange={(event) => onOnlyDifferencesChange(event.target.checked)}
          />
          {t('dirCompare.onlyDifferences')}
        </label>

        <button onClick={() => setShowFilters((value) => !value)}>
          {t('dirCompare.filters')} {showFilters ? '▴' : '▾'}
        </button>

        <span className="sep" />

        <button
          disabled={!hasSelection}
          onClick={() => onCopy('left')}
          title={t('dirCompare.copyRightTooltip')}
        >
          {t('dirCompare.copyRight')}
        </button>
        <button
          disabled={!hasSelection}
          onClick={() => onCopy('right')}
          title={t('dirCompare.copyLeftTooltip')}
        >
          {t('dirCompare.copyLeft')}
        </button>
        <button
          disabled={!hasSelection}
          onClick={() => onMove('left')}
          title={t('dirCompare.moveRightTooltip')}
        >
          {t('dirCompare.moveRight')}
        </button>
        <button
          disabled={!hasSelection}
          onClick={() => onMove('right')}
          title={t('dirCompare.moveLeftTooltip')}
        >
          {t('dirCompare.moveLeft')}
        </button>

        <span className="sep" />

        <button
          disabled={!hasSelection}
          onClick={() => onDelete('left')}
          title={t('dirCompare.deleteLeftTooltip')}
        >
          {t('dirCompare.deleteLeft')}
        </button>
        <button
          disabled={!hasSelection}
          onClick={() => onDelete('right')}
          title={t('dirCompare.deleteRightTooltip')}
        >
          {t('dirCompare.deleteRight')}
        </button>

        <span className="spacer" />

        <button onClick={onSync} title={t('dirCompare.syncTooltip')}>
          {t('dirCompare.sync')}
        </button>
      </div>

      {showFilters && (
        <div className="toolbar filters">
          <label title={t('dirCompare.excludeTooltip')}>
            {t('dirCompare.exclude')}
            <input
              type="text"
              size={40}
              value={filters.exclude.join(', ')}
              onChange={(event) =>
                onFiltersChange({ ...filters, exclude: splitGlobs(event.target.value) })
              }
            />
          </label>
          <label title={t('dirCompare.includeOnlyTooltip')}>
            {t('dirCompare.includeOnly')}
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
            {t('dirCompare.includeHidden')}
          </label>
          <span className="spacer" />
          <button onClick={onCompare} disabled={!canCompare || running}>
            {t('dirCompare.applyAndCompare')}
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
