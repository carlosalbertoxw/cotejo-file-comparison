import { useTranslation } from 'react-i18next'
import { RELEASES_URL } from '@shared/links'
import { formatVersion } from '@shared/version'
import { useUpdates } from '../../state/updateStore'
import { ExternalLink } from './ExternalLink'

/**
 * Aviso de version nueva. Ocupa una franja sobre la barra de pestanas y se
 * puede cerrar: quien no quiera actualizar no tiene por que verlo cada vez que
 * abre la aplicacion, pero volvera a aparecer cuando salga la siguiente.
 */
export function UpdateBanner(): React.JSX.Element | null {
  const { t } = useTranslation()
  const status = useUpdates((state) => state.status)
  const latest = useUpdates((state) => state.latest)
  const dismissed = useUpdates((state) => state.dismissed)
  const dismiss = useUpdates((state) => state.dismiss)

  if (status !== 'available' || !latest || latest === dismissed) return null

  return (
    <div className="update-banner" role="status">
      <span aria-hidden="true">⬆</span>
      <span>{t('update.available', { version: formatVersion(latest) })}</span>
      <ExternalLink href={RELEASES_URL}>{t('update.download')}</ExternalLink>
      <span className="spacer" />
      <button className="update-dismiss" title={t('update.dismiss')} onClick={dismiss}>
        ✕
      </button>
    </div>
  )
}
