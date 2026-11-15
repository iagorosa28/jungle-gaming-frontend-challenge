import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/styles.css'

async function bootstrap() {
  // Explicit demo default. Never condition this on import.meta.env.DEV.
  const mockSetting = import.meta.env.VITE_ENABLE_MOCKS ?? 'true'
  if (mockSetting !== 'true' && mockSetting !== 'false') throw new Error('VITE_ENABLE_MOCKS deve ser true ou false.')
  if (mockSetting === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ serviceWorker: { url: '/mockServiceWorker.js' }, quiet: true, onUnhandledRequest: 'bypass' })
  }
  const { App } = await import('./app/providers')
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
}

void bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar a demonstração', error)
  const root = document.getElementById('root')!
  const heading = document.createElement('h1')
  heading.textContent = 'Não foi possível iniciar a demonstração.'
  const message = document.createElement('p')
  message.textContent = 'Verifique a configuração e o suporte a Service Worker. Recarregue para tentar novamente.'
  root.setAttribute('role', 'alert')
  root.append(heading, message)
})
