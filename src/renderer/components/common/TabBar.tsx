import { useTranslation } from 'react-i18next'
import { useSession } from '../../state/sessionStore'
import { MOD_LABEL } from '../../platform'
import { LanguageSwitcher } from './LanguageSwitcher'

export function TabBar(): React.JSX.Element {
  const { t } = useTranslation()
  const tabs = useSession((state) => state.tabs)
  const activeId = useSession((state) => state.activeId)
  const setActive = useSession((state) => state.setActive)
  const closeTab = useSession((state) => state.closeTab)
  const openTab = useSession((state) => state.openTab)

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab${tab.id === activeId ? ' active' : ''}`}
          onMouseDown={() => setActive(tab.id)}
          title={[tab.leftPath, tab.rightPath].filter(Boolean).join('\n')}
        >
          <span aria-hidden="true">{tab.kind === 'text' ? '≡' : '🗀'}</span>
          <span className="tab-title">
            {tab.title ||
              t(tab.kind === 'text' ? 'tabs.defaultTitleText' : 'tabs.defaultTitleDir')}
          </span>
          {tab.dirty && (
            <span className="tab-dirty" title={t('common.unsavedChanges')}>
              ●
            </span>
          )}
          <button
            className="tab-close"
            title={t('tabs.closeTooltip', { mod: MOD_LABEL })}
            onClick={(event) => {
              event.stopPropagation()
              closeTab(tab.id)
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        className="tab-new"
        title={t('tabs.newTextTooltip', { mod: MOD_LABEL })}
        onClick={() => openTab('text')}
      >
        {t('tabs.newText')}
      </button>
      <button className="tab-new" title={t('tabs.newDirTooltip')} onClick={() => openTab('dir')}>
        {t('tabs.newDir')}
      </button>
      <span className="tab-bar-spacer" />
      <LanguageSwitcher />
    </div>
  )
}
