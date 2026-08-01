import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '../../i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Red de seguridad de ultimo nivel.
 *
 * Sin esto, cualquier fallo al montar (por ejemplo, un preload que no cargo y
 * deja `window.api` sin definir) deja la ventana completamente en blanco, que
 * es lo peor que le puedes ensenar a alguien que acaba de abrir la aplicacion.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Fallo no controlado en la interfaz:', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    // Instancia standalone de i18next: aqui no se puede depender de hooks ni
    // de contexto de React, porque este fallback se renderiza tras un crash.
    return (
      <div className="empty-state">
        <h2>{i18n.t('errorBoundary.title')}</h2>
        <p className="error-detail">{error.message}</p>
        {typeof window.api === 'undefined' && (
          <p>
            {i18n.t('errorBoundary.preloadHintBefore')}
            <code>npm run build</code>
            {i18n.t('errorBoundary.preloadHintAfter')}
          </p>
        )}
        <button onClick={() => this.setState({ error: null })}>{i18n.t('errorBoundary.retry')}</button>
      </div>
    )
  }
}
