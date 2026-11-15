import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate } from '@tanstack/react-router'
import axios from 'axios'
import { orderInputSchema, type Attempt, type OrderInput, type Quote, type Session } from '@/shared/contracts/market'
import { Button } from '@/shared/components/ui/button'
import { marketApi, marketKey, errorCode } from './api'
import { readAttempt, saveAttempt, clearAttempt } from './attempt'
import { useSession } from './session'
import { Failure, Loading, QuoteSummary } from './components'
import { useQuote } from './queries'

export function CheckoutPage() {
  const session = useSession().data!
  const [attempt, setAttempt] = useState<Attempt | null>(() => readAttempt(session.user!.id))
  return <><h1 className="page-title">Pagamento com carteira</h1><p className="mb-7 text-muted-foreground">Compra simulada. Nenhuma carteira real será conectada e nenhum valor será cobrado.</p>{attempt ? <SubmitAttempt session={session} attempt={attempt} reset={() => setAttempt(null)} /> : <CheckoutForm session={session} submit={value => { saveAttempt(session.user!.id, value); setAttempt(value) }} />}</>
}
function SubmitAttempt({ session, attempt, reset }: { session: Session; attempt: Attempt; reset: () => void }) {
  const client = useQueryClient()
  const api = marketApi(session.id)
  const query = useQuery({ queryKey: [...marketKey(session.id), 'attempt', attempt.key], retry: false, queryFn: async () => {
    try { return await api.recover(attempt.key) }
    catch (error) { if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error }
    try { return await api.createOrder(attempt) }
    catch (error) {
      if (errorCode(error) === 'QUOTE_CHANGED' || errorCode(error) === 'IDEMPOTENCY_CONFLICT' || errorCode(error) === 'SESSION_EXPIRED') throw error
      // A failed response is ambiguous: recover before allowing another attempt.
      try { return await api.recover(attempt.key) } catch { throw error }
    }
  } })
  if (query.data) return <Navigate to="/orders/$orderId" params={{ orderId: query.data.id }} replace />
  if (query.isPending) return <section aria-live="polite"><p>Enviando ou recuperando sua compra. Se atualizar a página, o pedido será recuperado sem duplicação.</p><Loading /></section>
  return <section className="space-y-5"><Failure error={query.error} />{errorCode(query.error) === 'QUOTE_CHANGED' ? <Button onClick={() => { clearAttempt(session.user!.id); void client.invalidateQueries({ queryKey: marketKey(session.id) }); reset() }}>Revisar nova cotação</Button> : <Button onClick={() => void query.refetch()}>Recuperar a mesma tentativa</Button>}<Link to="/orders" className="nav-link inline-block">Consultar meus pedidos</Link></section>
}
function CheckoutForm({ session, submit }: { session: Session; submit: (attempt: Attempt) => void }) {
  const api = marketApi(session.id)
  const quote = useQuote(session)
  const wallets = useQuery({ queryKey: [...marketKey(session.id), 'wallets'], queryFn: ({ signal }) => api.wallets(signal) })
  const [walletId, setWalletId] = useState('')
  const [review, setReview] = useState<{ input: OrderInput; quote: Quote } | null>(null)
  const [validation, setValidation] = useState('')
  if (quote.isPending || wallets.isPending) return <Loading />
  if (quote.isError || wallets.isError) return <Failure error={quote.error ?? wallets.error} retry={() => { void quote.refetch(); void wallets.refetch() }} />
  const selected = wallets.data.find(w => w.id === walletId)
  const changed = review && (JSON.stringify(review.quote.lines) !== JSON.stringify(quote.data.lines) || review.quote.totalEth !== quote.data.totalEth || !quote.data.valid)
  return <div className="grid items-start gap-7 lg:grid-cols-[1.1fr_1fr]">
    <div className="space-y-5">{review ? <section className="panel space-y-5"><h2 className="text-xl">Revise e confirme</h2><p>{review.input.buyer.name}<br />{review.input.buyer.email}</p><p>Carteira: {wallets.data.find(w => w.id === review.input.walletId)?.name}<br />Rede: {review.input.network}</p>{changed && <p role="alert" className="text-destructive">Preço ou disponibilidade mudaram. Revise uma nova cotação antes de confirmar.</p>}<Button className="w-full" disabled={!!changed} onClick={() => {
      try { submit({ key: crypto.randomUUID(), input: review.input }) } catch { setValidation('Não foi possível preservar a tentativa no navegador. Nenhum pedido foi enviado.') }
    }}>Confirmar compra fictícia</Button><Button className="w-full" variant="outline" onClick={() => { setReview(null); void quote.refetch() }}>Alterar ou atualizar revisão</Button></section> : <form className="panel space-y-5" onSubmit={event => {
      event.preventDefault()
      const fields = Object.fromEntries(new FormData(event.currentTarget))
      const parsed = orderInputSchema.safeParse({ quoteId: quote.data.id, walletId: fields.walletId, network: fields.network, buyer: { name: fields.name, email: fields.email } })
      if (!parsed.success) { setValidation('Revise nome, e-mail, carteira e rede.'); return }
      setValidation(''); setReview({ input: parsed.data, quote: quote.data })
    }}>
      <h2 className="text-xl">Dados do colecionador</h2>
      <label className="form-label">Nome do comprador<input className="field" name="name" defaultValue={session.user!.name} required minLength={2} maxLength={80} autoComplete="name" aria-describedby="checkout-feedback" /></label>
      <label className="form-label">E-mail do comprador<input className="field" type="email" name="email" defaultValue={session.user!.email} required autoComplete="email" aria-describedby="checkout-feedback" /></label>
      <div className="form-label"><label htmlFor="checkout-wallet">Carteira fictícia</label><select id="checkout-wallet" className="field" name="walletId" value={walletId} onChange={e => setWalletId(e.target.value)} required><option value="">Selecione uma carteira</option>{wallets.data.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
      {selected && <p className="text-sm text-muted-foreground">{selected.address} · Conexão simulada ao selecionar</p>}
      <div className="form-label"><label htmlFor="checkout-network">Rede fictícia</label><select id="checkout-network" className="field" name="network" key={walletId} required disabled={!selected}><option value="">Selecione uma rede</option>{selected?.networks.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
      <Button className="w-full" disabled={!quote.data.valid || quote.isFetching}>Revisar compra</Button>
    </form>}{validation && <p role="alert" id="checkout-feedback">{validation}</p>}<Link to="/cart" className="nav-link inline-block">Voltar ao carrinho</Link></div>
    <QuoteSummary quote={review?.quote ?? quote.data} />
  </div>
}
