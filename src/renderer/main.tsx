import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './styles/theme.css'
import './styles/diff.css'
import './styles/dir.css'

const container = document.getElementById('root')
if (!container) throw new Error('Falta el contenedor #root')

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
