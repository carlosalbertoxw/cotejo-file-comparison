import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import { App } from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './styles/theme.css'
import './styles/diff.css'
import './styles/dir.css'

/**
 * Nada de lo que se suelte fuera de una zona con gestor propio hace nada.
 *
 * El comportamiento por defecto del navegador ante un archivo soltado es
 * navegar a el. Dentro de Electron eso reemplaza la aplicacion por el
 * documento soltado, con el preload cargado. La ventana lo bloquea ademas con
 * `will-navigate`; esto lo corta antes, y de paso evita el parpadeo.
 */
for (const type of ['dragover', 'drop'] as const) {
  window.addEventListener(type, (event) => event.preventDefault())
}

const container = document.getElementById('root')
if (!container) throw new Error('Falta el contenedor #root')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
