import { useTranslation } from 'react-i18next'
import { MOD_LABEL } from '../../platform'

interface Props {
  kind: 'file' | 'directory'
  leftPath: string | null
  rightPath: string | null
  leftDirty?: boolean
  rightDirty?: boolean
  onPick: (side: 'left' | 'right') => void
  onSetPath: (side: 'left' | 'right', path: string) => void
  /** Si se pasa, cada lado gana su propio boton de guardado. */
  onSave?: (side: 'left' | 'right') => void
}

export function PathBar({
  kind,
  leftPath,
  rightPath,
  leftDirty,
  rightDirty,
  onPick,
  onSetPath,
  onSave
}: Props): React.JSX.Element {
  const { t } = useTranslation()

  const slot = (side: 'left' | 'right', path: string | null, dirty?: boolean): React.JSX.Element => (
    <div className="path-slot">
      {dirty && <span className="dirty-dot" title={t('common.unsavedChanges')}>●</span>}
      <input
        type="text"
        value={path ?? ''}
        placeholder={t(kind === 'file' ? 'pathBar.filePlaceholder' : 'pathBar.dirPlaceholder')}
        spellCheck={false}
        onChange={(event) => onSetPath(side, event.target.value)}
        title={path ?? ''}
      />
      <button
        onClick={() => onPick(side)}
        title={t(kind === 'file' ? 'pathBar.pickFile' : 'pathBar.pickDirectory')}
      >
        …
      </button>
      {onSave && (
        <button
          onClick={() => onSave(side)}
          disabled={!dirty}
          title={t(side === 'left' ? 'pathBar.saveLeft' : 'pathBar.saveRight', {
            mod: MOD_LABEL
          })}
        >
          {t('pathBar.save')}
        </button>
      )}
    </div>
  )

  return (
    <div className="path-bar">
      {slot('left', leftPath, leftDirty)}
      {slot('right', rightPath, rightDirty)}
    </div>
  )
}
