import { useSession } from '../../state/sessionStore'

export function TabBar(): React.JSX.Element {
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
          <span className="tab-title">{tab.title}</span>
          {tab.dirty && (
            <span className="tab-dirty" title="Hay cambios sin guardar">
              ●
            </span>
          )}
          <button
            className="tab-close"
            title="Cerrar (Ctrl+W)"
            onClick={(event) => {
              event.stopPropagation()
              closeTab(tab.id)
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button className="tab-new" title="Comparar texto (Ctrl+T)" onClick={() => openTab('text')}>
        ＋ Texto
      </button>
      <button className="tab-new" title="Comparar carpetas" onClick={() => openTab('dir')}>
        ＋ Carpetas
      </button>
    </div>
  )
}
