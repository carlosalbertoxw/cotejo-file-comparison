import { useTranslation } from 'react-i18next'
import { useSession } from '../../state/sessionStore'
import { HistoryList } from './HistoryList'
import { LanguageSwitcher } from './LanguageSwitcher'

interface Props {
  onShowAbout: () => void
}

export function WelcomeView({ onShowAbout }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const openTab = useSession((state) => state.openTab)

  return (
    <div className="tab-panel">
      <div className="empty-state">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <h2>Cotejo</h2>
        </div>
        <p>{t('welcome.tagline')}</p>
        <div className="choices">
          <button onClick={() => openTab('text')}>{t('welcome.compareText')}</button>
          <button onClick={() => openTab('dir')}>{t('welcome.compareDirs')}</button>
        </div>
        <p className="hint">{t('welcome.hint')}</p>
        <HistoryList />
        <LanguageSwitcher />
        <button className="link-button" onClick={onShowAbout}>
          {t('about.open')}
        </button>
      </div>
    </div>
  )
}
