import { useTranslation } from 'react-i18next'

interface Props {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        <div className="dialog-body">{message}</div>
        <div className="dialog-actions">
          <button onClick={onCancel}>{t('common.cancel')}</button>
          <button className={danger ? '' : 'primary'} onClick={onConfirm} autoFocus>
            {confirmLabel ?? t('common.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
