import { useEffect, useRef } from 'react'
import { House, ShoppingCart, LogIn } from 'lucide-react'
import { CatalogSearchForm } from './catalog-search'
import { Link, Navigate, Outlet, useLocation, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@/shared/contracts/market'
import { Button } from '@/shared/components/ui/button'
import { marketApi, marketKey, sessionKey } from './api'
import { useSession } from './session'
import { useMarketSocket } from './use-market-socket'
import { Failure, Loading } from './components'
import { useCart } from './queries'

export function MarketLayout() {
  const query = useSession()
  const client = useQueryClient()
  useEffect(() => {
    const expire = () => { void client.invalidateQueries({ queryKey: sessionKey }) }
    window.addEventListener('market:session-expired', expire)
    return () => window.removeEventListener('market:session-expired', expire)
  }, [client])
  if (query.isPending) return <main id="conteudo" className="market"><Loading /></main>
  if (query.isError) return <main id="conteudo" className="market"><Failure error={query.error} retry={query.refetch} /></main>
  return <ScopedLayout key={query.data.id} session={query.data} />
}
function ScopedLayout({ session }: { session: Session }) {
  const headerRef = useRef<HTMLElement>(null)
  const client = useQueryClient()
  const router = useRouter()
  const cart = useCart(session)
  const realtime = useMarketSocket(session)
  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const root = document.documentElement.style
    const previous = root.getPropertyValue('--market-header-offset')
    const measure = () => root.setProperty('--market-header-offset', `${Math.ceil(header.getBoundingClientRect().height) + 16}px`)
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    measure()
    return () => { observer.disconnect(); if (previous) root.setProperty('--market-header-offset', previous); else root.removeProperty('--market-header-offset') }
  }, [])
  useEffect(() => () => {
    void client.cancelQueries({ queryKey: marketKey(session.id) })
    client.removeQueries({ queryKey: marketKey(session.id) })
    client.getMutationCache().getAll().forEach(m => { if (m.options.mutationKey?.[0] === session.id) client.getMutationCache().remove(m) })
  }, [client, session.id])
  const logout = useMutation({ mutationKey: [session.id, 'logout'], mutationFn: () => marketApi(session.id).logout(), onSuccess: async result => {
    await client.cancelQueries({ queryKey: marketKey(session.id) })
    // Leave the private route before publishing the guest session, so its
    // expiration redirect cannot race the explicit logout navigation.
    await router.navigate({ to: '/' })
    client.removeQueries({ queryKey: marketKey(session.id) })
    client.setQueryData(sessionKey, result)
  } })
  return <div className="market">
    <header ref={headerRef} className="market-header">
      <Link to="/" className="site-brand" aria-label="Kurio, início">KURIO</Link>
      <nav aria-label="Marketplace" className="market-nav">
        <Link to="/" activeOptions={{ exact: true, includeSearch: false, includeHash: true }} className="nav-link"><House aria-hidden="true" /><span>Início</span></Link>
        <Link to="/" hash="colecao" activeOptions={{ exact: true, includeSearch: false, includeHash: true }} className="market-link">Mercado</Link>
        {session.user && <Link to="/orders" className="nav-link">Meus pedidos</Link>}
      </nav>
      <div className="header-actions">
        <CatalogSearchForm id="topbar-search" className="topbar-search" placeholder="Buscar NFTs" />
        <Link to="/cart" className="header-cart" aria-label={`Carrinho (${cart.data?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0})`}><ShoppingCart aria-hidden="true" /><span className="cart-count" aria-hidden="true">{cart.data?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0}</span><span className="mobile-action-label">Carrinho</span></Link>
        {!session.user && <Link to="/login" search={{ returnTo: '/checkout' }} className="login-link"><LogIn aria-hidden="true" /><span>Entrar</span></Link>}
      </div>
    </header>
    {session.user && <div className="account-tools"><span>{session.user.name}</span><Button variant="ghost" disabled={logout.isPending} onClick={() => logout.mutate()}>Sair</Button></div>}
    {realtime.notice && <p role="status" className="market-notice mb-6 rounded-xl border border-border p-3 text-sm text-primary">{realtime.notice}</p>}
    {logout.isError && <Failure error={logout.error} />}
    <main id="conteudo"><Outlet /></main>
    <section className="realtime-tools" aria-label="Simulação e tempo real"><Link to="/demo" className="demo-link">Cenários da demonstração</Link>    <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span data-testid="market-socket">{realtime.connected ? 'Tempo real conectado' : 'Tempo real desconectado'}</span><button className="underline" onClick={realtime.toggle}>{realtime.connected ? 'Desconectar tempo real' : 'Reconectar tempo real'}</button><span data-testid="market-events">{realtime.received} eventos · {realtime.ignored} ignorados</span></div>
    </section>
  </div>
}
export function PrivatePage({ children }: { children: React.ReactNode }) {
  const { data } = useSession()
  const location = useLocation()
  if (!data?.user) return <Navigate to="/login" search={{ returnTo: location.pathname }} replace />
  return children
}
