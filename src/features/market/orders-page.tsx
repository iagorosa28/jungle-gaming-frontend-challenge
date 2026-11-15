import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { marketApi, marketKey } from './api'
import { clearAttempt, readAttempt } from './attempt'
import { useSession } from './session'
import { Failure, Loading, Money, QuoteSummary } from './components'

const status = { pending: 'Pedido pendente', confirmed: 'Compra confirmada', declined: 'Pagamento recusado' }
export function OrdersPage() {
  const session = useSession().data!
  const query = useQuery({ queryKey: [...marketKey(session.id), 'orders'], queryFn: ({ signal }) => marketApi(session.id).orders(signal) })
  return <><h1 className="page-title">Meus pedidos</h1>{query.isPending ? <Loading /> : query.isError ? <Failure error={query.error} retry={query.refetch} /> : !query.data.length ? <p className="panel">Nenhum pedido nesta conta.</p> : <div className="space-y-4">{query.data.map(order => <article className="panel space-y-3" key={order.id}><h2>{status[order.status]}</h2><p className="break-all text-sm text-muted-foreground">{order.id}</p><p><Money value={order.quote.totalEth} /></p><Link to="/orders/$orderId" params={{ orderId: order.id }} className="nav-link inline-block">Abrir pedido</Link></article>)}</div>}</>
}
export function OrderPage({ id }: { id: string }) {
  const session = useSession().data!
  const api = marketApi(session.id)
  const query = useQuery({ queryKey: [...marketKey(session.id), 'order', id], queryFn: ({ signal }) => api.order(id, signal), refetchInterval: query => query.state.data?.status === 'pending' ? 2_000 : false })
  const receipt = useQuery({ queryKey: [...marketKey(session.id), 'receipt', id], queryFn: ({ signal }) => api.receipt(id, signal), enabled: query.data?.status === 'confirmed' })
  useEffect(() => {
    if (query.data && readAttempt(session.user!.id)?.key === query.data.key) clearAttempt(session.user!.id)
  }, [query.data, session.user])
  if (query.isPending) return <Loading />
  if (query.isError) return <Failure error={query.error} retry={query.refetch} />
  const order = query.data
  return <><h1 className="page-title" aria-live="polite">{status[order.status]}</h1><p className="mb-6 break-all text-sm text-muted-foreground" data-testid="order-id">Pedido {order.id} · v{order.version}</p>
    {order.status === 'pending' && <section className="panel space-y-4"><p role="status">Aguardando a resposta do pagamento fictício. Este pedido ainda não está confirmado.</p><p>Você pode atualizar a página ou reconectar. O pedido será consultado novamente, sem uma nova compra.</p></section>}
    {order.status === 'declined' && <section className="panel space-y-5"><p role="alert">A carteira recusou o pagamento. Nenhum recibo de sucesso foi emitido e seus itens continuam no carrinho.</p><Link to="/cart" className="nav-link inline-block">Voltar ao carrinho e tentar novamente</Link></section>}
    {order.status === 'confirmed' && (receipt.isPending ? <Loading /> : receipt.isError ? <Failure error={receipt.error} retry={receipt.refetch} /> : <section aria-label="Recibo confirmado" className="grid gap-6 md:grid-cols-2"><div className="panel space-y-5"><h2 className="text-xl text-success">Recibo da compra fictícia</h2><p>Comprador: {receipt.data.input.buyer.name}</p><p className="break-all">Transação: {receipt.data.transaction}</p><p>Rede: {receipt.data.input.network}</p><p className="text-sm text-muted-foreground">Snapshot confirmado e preservado. Sem transação em blockchain.</p></div><QuoteSummary quote={receipt.data.quote} /></section>)}
    <Link to="/orders" className="nav-link my-6 inline-block">Todos os pedidos</Link>
  </>
}
