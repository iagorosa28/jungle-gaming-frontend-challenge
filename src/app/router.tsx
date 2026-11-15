import { createRootRoute, createRoute, createRouter, Link, Navigate } from '@tanstack/react-router'
import { scenarioSchema } from '@/shared/contracts/spike'
import { SpikePage } from '@/features/spike/spike-page'
import { Layout } from './layout'

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: () => <main id="conteudo" className="mx-auto max-w-6xl px-5 py-20"><h1 className="text-3xl">Página não encontrada</h1><Link to="/spike" search={{ scenario: 'success' }} className="mt-5 inline-block text-primary underline">Voltar ao spike</Link></main>,
  errorComponent: () => <main id="conteudo" className="p-10"><h1 role="alert">Não foi possível abrir esta página.</h1><a href="/spike" className="text-primary underline">Reabrir o spike</a></main>,
})
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => <Navigate to="/spike" search={{ scenario: 'success' }} replace /> })
const spikeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spike',
  validateSearch: (search: Record<string, unknown>) => ({ scenario: scenarioSchema.catch('success').parse(search.scenario) }),
  component: function SpikeRoute() {
    const { scenario } = spikeRoute.useSearch()
    return <SpikePage scenario={scenario} />
  },
})

export const router = createRouter({ routeTree: rootRoute.addChildren([indexRoute, spikeRoute]), defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
