import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { EnvironmentProvider } from './components/EnvironmentContext'
import { registerErrorListeners } from './utils/errorReporting'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element "#root" was not found.')
}

// Register global error listeners for unhandled rejections and errors
registerErrorListeners()

createRoot(rootElement).render(
  <StrictMode>
    <EnvironmentProvider>
      <App />
    </EnvironmentProvider>
  </StrictMode>
)
