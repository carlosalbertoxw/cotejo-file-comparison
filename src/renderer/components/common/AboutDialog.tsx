import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ISSUES_URL, RELEASES_URL, REPO_URL } from '@shared/links'
import { formatVersion } from '@shared/version'
import type { AppInfo } from '@shared/types'
import { useUpdates } from '../../state/updateStore'
import { ExternalLink } from './ExternalLink'

// Lo que dice LICENSE. No hay forma de leerlo en tiempo de ejecucion desde el
// renderer, asi que si cambia la licencia hay que cambiarlo aqui tambien.
const AUTHOR = 'Carlos Alberto'
const LICENSE_YEAR = '2026'

interface Props {
  onClose: () => void
}

export function AboutDialog({ onClose }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<AppInfo | null>(null)
  const status = useUpdates((state) => state.status)
  const latest = useUpdates((state) => state.latest)
  const check = useUpdates((state) => state.check)

  useEffect(() => {
    let alive = true
    void window.api.appInfo().then(
      (value) => {
        if (alive) setInfo(value)
      },
      () => {
        // Sin datos del proceso principal el dialogo se ensena igual, solo que
        // sin la tabla de versiones.
      }
    )
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const updateMessage =
    status === 'checking'
      ? t('update.checking')
      : status === 'available' && latest
        ? t('update.availableShort', { version: formatVersion(latest) })
        : status === 'upToDate'
          ? t('update.upToDate')
          : status === 'error'
            ? t('update.error')
            : null

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog about" role="dialog" aria-modal="true" aria-label={t('about.title')}>
        <h3>{t('about.title')}</h3>
        <div className="dialog-body">
          <div className="about-header">
            <span className="brand-mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <div>
              <h2>Cotejo</h2>
              <p className="about-version">{info ? formatVersion(info.version) : '—'}</p>
            </div>
          </div>

          <p className="about-tagline">{t('welcome.tagline')}</p>

          <dl className="about-rows">
            <dt>{t('about.author')}</dt>
            <dd>{AUTHOR}</dd>
            <dt>{t('about.license')}</dt>
            <dd>
              MIT · © {LICENSE_YEAR} {AUTHOR}
            </dd>
            {info && (
              <>
                <dt>{t('about.system')}</dt>
                <dd>
                  {info.platform} · {info.arch}
                </dd>
                <dt>Electron</dt>
                <dd>
                  {info.electron} · Chromium {info.chromium} · Node {info.node}
                </dd>
              </>
            )}
          </dl>

          <div className="about-links">
            <ExternalLink href={REPO_URL}>{t('about.repository')}</ExternalLink>
            <ExternalLink href={RELEASES_URL}>{t('about.releases')}</ExternalLink>
            <ExternalLink href={ISSUES_URL}>{t('about.issues')}</ExternalLink>
          </div>

          <div className="about-update">
            <button onClick={() => void check(true)} disabled={status === 'checking'}>
              {t('update.check')}
            </button>
            {updateMessage && <span className="about-update-status">{updateMessage}</span>}
            {status === 'available' && (
              <ExternalLink href={RELEASES_URL}>{t('update.download')}</ExternalLink>
            )}
          </div>
        </div>
        <div className="dialog-actions">
          <button className="primary" onClick={onClose} autoFocus>
            {t('about.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
