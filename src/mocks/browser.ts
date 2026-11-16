import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

let recovery: Promise<void> | undefined
export function recoverMockWorker() {
  // MSW 2.15's worker keeps active client IDs in memory. Re-send its activation
  // handshake after termination; start() alone is a no-op in the page runtime.
  // Do not stop MSW: that also disposes its WebSocket interceptor.
  recovery ??= new Promise<void>((resolve, reject) => {
    const controller = navigator.serviceWorker.controller
    if (!controller) { reject(new Error('Service Worker indisponível. Verifique a conexão e tente novamente.')); return }
    const cleanup = () => { window.clearTimeout(timeout); navigator.serviceWorker.removeEventListener('message', confirm) }
    const confirm = (event: MessageEvent) => {
      if (event.source === controller && event.data?.type === 'MOCKING_ENABLED') { cleanup(); resolve() }
    }
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error('A API de demonstração não respondeu. Tente novamente.')) }, 8000)
    navigator.serviceWorker.addEventListener('message', confirm)
    try { controller.postMessage('MOCK_ACTIVATE') }
    catch (error) { cleanup(); reject(error) }
  }).finally(() => { recovery = undefined })
  return recovery
}
