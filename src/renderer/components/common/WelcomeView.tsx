import { useSession } from '../../state/sessionStore'

export function WelcomeView(): React.JSX.Element {
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
        <p>Pon dos cosas una al lado de la otra y mira en que se diferencian.</p>
        <div className="choices">
          <button onClick={() => openTab('text')}>Comparar archivos de texto</button>
          <button onClick={() => openTab('dir')}>Comparar carpetas</button>
        </div>
        <p className="hint">
          También puedes arrastrar dos archivos o dos carpetas sobre esta ventana.
        </p>
      </div>
    </div>
  )
}
