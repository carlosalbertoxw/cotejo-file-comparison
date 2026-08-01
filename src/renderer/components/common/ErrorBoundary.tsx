import { Component, type ErrorInfo, type ReactNode } from 'react'

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

    return (
      <div className="empty-state">
        <h2>Cotejo no pudo arrancar</h2>
        <p className="error-detail">{error.message}</p>
        {typeof window.api === 'undefined' && (
          <p>
            No se cargo el puente con el proceso principal. Reinicia la aplicacion; si vuelve a
            pasar, ejecuta <code>npm run build</code> para regenerar el preload.
          </p>
        )}
        <button onClick={() => this.setState({ error: null })}>Reintentar</button>
      </div>
    )
  }
}
