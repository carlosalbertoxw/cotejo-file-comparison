import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  danger?: boolean
  /**
   * Una tercera salida entre cancelar y confirmar, como «Cerrar sin guardar»
   * junto a «Guardar y cerrar». Nunca es la accion por defecto.
   */
  alternative?: { label: string; onClick: () => void }
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  alternative,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  const { t } = useTranslation()

  // Escape cancela, como en «Acerca de». Un dialogo que pregunta antes de
  // borrar tiene que poder cerrarse sin buscar el boton.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

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
          {alternative && <button onClick={alternative.onClick}>{alternative.label}</button>}
          <button className={danger ? '' : 'primary'} onClick={onConfirm} autoFocus>
            {confirmLabel ?? t('common.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
