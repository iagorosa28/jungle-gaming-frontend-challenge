import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/components/ui/button'
import type { Cart, Session } from '@/shared/contracts/market'
import { marketApi, marketKey, sessionKey } from './api'
import { useSession } from './session'
import { Failure, Loading, QuoteSummary } from './components'
import { useCart, useQuote } from './queries'

export function CartPage() {
  const session = useSession().data!
  const cart = useCart(session)
  const quote = useQuote(session)
  const client = useQueryClient()
  const cartKey = [...marketKey(session.id), 'cart']
  const edit = useMutation({
    mutationKey: [session.id, 'cart'], mutationFn: marketApi(session.id).editCart,
    onMutate: async input => {
      await client.cancelQueries({ queryKey: cartKey })
      const previous = client.getQueryData<Cart>(cartKey)
      if (previous) client.setQueryData<Cart>(cartKey, { ...previous, items: input.mode === 'remove' ? previous.items.filter(i => i.nftId !== input.nftId) : previous.items.map(i => i.nftId === input.nftId ? { ...i, quantity: input.quantity } : i) })
      return { previous }
    },
    onError: (_, __, context) => {
      if (context?.previous && client.getQueryData<Session>(sessionKey)?.id === session.id) client.setQueryData(cartKey, context.previous)
    },
    onSettled: () => client.invalidateQueries({ queryKey: marketKey(session.id) }),
  })
  if (cart.isPending || quote.isPending) return <Loading />
  if (cart.isError || quote.isError) return <Failure error={cart.error ?? quote.error} retry={() => { void cart.refetch(); void quote.refetch() }} />
  return <><h1 className="page-title">Carrinho de NFTs</h1>{!cart.data.items.length ? <section className="panel space-y-4"><p>Seu carrinho está vazio.</p><Link to="/" className="nav-link inline-block">Explorar NFTs →</Link></section> : <div className="grid gap-7 lg:grid-cols-[1.2fr_1fr]"><section className="space-y-4" aria-label="Itens do carrinho">{cart.data.items.map(item => {
    const line = quote.data.lines.find(l => l.nftId === item.nftId)
    return <article className="panel space-y-4" key={item.nftId}><h2 className="text-lg font-semibold">{line?.name ?? item.nftId}</h2><p className="text-sm text-muted-foreground">Edição padrão</p><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-3">Quantidade<input aria-label={`Quantidade de ${line?.name ?? item.nftId}`} type="number" min="1" max="10" step="1" value={item.quantity} disabled={edit.isPending} onChange={event => edit.mutate({ ...item, quantity: Number(event.target.value), mode: 'update' })} className="field w-20" /></label><Button variant="outline" disabled={edit.isPending} onClick={() => edit.mutate({ ...item, mode: 'remove' })}>Remover {line?.name}</Button></div></article>
  })}{edit.isError && <Failure error={edit.error} />}<Link to="/" className="nav-link inline-block">Continuar explorando</Link></section><div className="space-y-5"><QuoteSummary quote={quote.data} /><Button asChild className="w-full"><Link to="/checkout">Continuar para checkout</Link></Button></div></div>}</>
}
