import { createRootRoute, createRoute, createRouter, Link, redirect } from '@tanstack/react-router'
import { scenarioSchema } from '@/shared/contracts/spike'
import { SpikePage } from '@/features/spike/spike-page'
import { Layout } from './layout'
import { MarketLayout, PrivatePage } from '@/features/market/market-layout'
import { CatalogPage, NftPage } from '@/features/market/catalog-page'
import { CartPage } from '@/features/market/cart-page'
import { AuthPage } from '@/features/market/auth-page'
import { CheckoutPage } from '@/features/market/checkout-page'
import { OrderPage, OrdersPage } from '@/features/market/orders-page'
import { DemoPage } from '@/features/market/demo-page'
import { session } from '@/features/market/api'
import { safeReturn } from '@/features/market/session'

const rootRoute = createRootRoute({
  component: Layout,
  notFoundComponent: () => <main id="conteudo" className="mx-auto max-w-6xl px-5 py-20"><h1 className="text-3xl">Página não encontrada</h1><Link to="/spike" search={{ scenario: 'success' }} className="mt-5 inline-block text-primary underline">Voltar ao spike</Link></main>,
  errorComponent: () => <main id="conteudo" className="p-10"><h1 role="alert">Não foi possível abrir esta página.</h1><a href="/spike" className="text-primary underline">Reabrir o spike</a></main>,
})
const marketRoute = createRoute({ getParentRoute: () => rootRoute, id: 'market', component: MarketLayout })
const indexRoute = createRoute({ getParentRoute: () => marketRoute, path: '/', component: CatalogPage })
const nftRoute = createRoute({ getParentRoute: () => marketRoute, path: '/nfts/$nftId', component: function NftRoute() { return <NftPage id={nftRoute.useParams().nftId} /> } })
const cartRoute = createRoute({ getParentRoute: () => marketRoute, path: '/cart', component: CartPage })
const authSearch = (search: Record<string, unknown>) => ({ returnTo: safeReturn(search.returnTo) })
const loginRoute = createRoute({ getParentRoute: () => marketRoute, path: '/login', validateSearch: authSearch, component: function LoginRoute() { return <AuthPage returnTo={loginRoute.useSearch().returnTo} /> } })
const registerRoute = createRoute({ getParentRoute: () => marketRoute, path: '/register', validateSearch: authSearch, component: function RegisterRoute() { return <AuthPage register returnTo={registerRoute.useSearch().returnTo} /> } })
const requireSession = async ({ location }: { location: { pathname: string } }) => {
  if (!(await session()).user) throw redirect({ to: '/login', search: { returnTo: safeReturn(location.pathname) } })
}
const checkoutRoute = createRoute({ getParentRoute: () => marketRoute, path: '/checkout', beforeLoad: requireSession, component: () => <PrivatePage><CheckoutPage /></PrivatePage> })
const ordersRoute = createRoute({ getParentRoute: () => marketRoute, path: '/orders', beforeLoad: requireSession, component: () => <PrivatePage><OrdersPage /></PrivatePage> })
const orderRoute = createRoute({ getParentRoute: () => marketRoute, path: '/orders/$orderId', beforeLoad: requireSession, component: function OrderRoute() { return <PrivatePage><OrderPage id={orderRoute.useParams().orderId} /></PrivatePage> } })
const demoRoute = createRoute({ getParentRoute: () => marketRoute, path: '/demo', component: DemoPage })
const spikeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spike',
  validateSearch: (search: Record<string, unknown>) => ({ scenario: scenarioSchema.catch('success').parse(search.scenario) }),
  component: function SpikeRoute() {
    const { scenario } = spikeRoute.useSearch()
    return <SpikePage scenario={scenario} />
  },
})

export const router = createRouter({ routeTree: rootRoute.addChildren([marketRoute.addChildren([indexRoute, nftRoute, cartRoute, loginRoute, registerRoute, checkoutRoute, ordersRoute, orderRoute, demoRoute]), spikeRoute]), defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
