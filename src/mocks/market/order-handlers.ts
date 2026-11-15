import { delay, http, HttpResponse } from 'msw'
import { attemptSchema, orderInputSchema } from '@/shared/contracts/market'
import { ApiError, endpoint, scope } from './http'
import { quote, quoteFingerprint, updateNft } from './pricing'
import { emitOrder, schedule, settle } from './orders'
import { save, state } from './store'
import { wallets } from './fixtures'

export const orderHandlers = [
  http.post('/api/orders', async ({ request }) => {
    let timeout = false
    const response = await endpoint(async request => {
      const input = orderInputSchema.parse(await request.json())
      const { owner } = scope(request, true)
      const parsedKey = attemptSchema.shape.key.safeParse(request.headers.get('Idempotency-Key'))
      if (!parsedKey.success) throw new ApiError(400, 'Chave de idempotência UUID obrigatória.')
      const key = parsedKey.data
      settle()
      const existing = state.orders.find(o => o.userId === owner && o.key === key)
      if (existing) {
        if (JSON.stringify(existing.input) !== JSON.stringify(input)) throw new ApiError(409, 'Chave já utilizada com conteúdo diferente.', 'IDEMPOTENCY_CONFLICT')
        return existing
      }
      if (state.orders.some(o => o.userId === owner && o.status === 'pending')) throw new ApiError(409, 'Há um pedido pendente. Consulte seus pedidos.')
      if (!state.triggered && ['price-change', 'sold-out'].includes(state.scenario)) {
        state.triggered = true
        updateNft(state.scenario === 'price-change' ? 'price' : 'stock')
      }
      const accepted = state.quotes[input.quoteId]
      const current = quote()
      if (!accepted || accepted.owner !== owner || accepted.quote.expiresAt <= Date.now() || !current.valid || quoteFingerprint(accepted.quote) !== quoteFingerprint(current)) {
        throw new ApiError(409, 'A cotação mudou ou expirou. Revise os valores e confirme novamente.', 'QUOTE_CHANGED')
      }
      const wallet = wallets.find(w => w.id === input.walletId)
      if (!wallet || !wallet.networks.some(n => n === input.network)) throw new ApiError(422, 'Selecione uma carteira e rede compatíveis.')
      const order = {
        id: crypto.randomUUID(), userId: owner, key, input, status: 'pending' as const, version: 1,
        quote: structuredClone(accepted.quote), createdAt: Date.now(),
        resolveAt: Date.now() + (state.scenario === 'pending' ? 60_000 : 2_000),
        outcome: state.scenario === 'declined' ? 'declined' as const : wallet.outcome, transaction: null,
      }
      state.orders.push(order)
      save()
      emitOrder(order)
      schedule(order)
      timeout = state.scenario === 'timeout'
      return order
    })({ request })
    // Commit first; deterministic lost response exercises lookup/retry without duplicating.
    if (timeout) { await delay(1_200); return HttpResponse.json({ message: 'Resposta indisponível após criação.', code: 'RESPONSE_TIMEOUT' }, { status: 504 }) }
    return response
  }),
  http.get('/api/orders', endpoint(request => { const { owner } = scope(request, true); settle(); return state.orders.filter(o => o.userId === owner) })),
  http.get('/api/orders/by-key/:key', endpoint(request => {
    const { owner } = scope(request, true)
    settle()
    const key = new URL(request.url).pathname.split('/').at(-1)
    const order = state.orders.find(o => o.userId === owner && o.key === key)
    if (!order) throw new ApiError(404, 'Pedido ainda não encontrado.')
    return order
  })),
  http.get('/api/orders/:id', endpoint(request => {
    const { owner } = scope(request, true)
    settle()
    const order = state.orders.find(o => o.userId === owner && o.id === new URL(request.url).pathname.split('/').at(-1))
    if (!order) throw new ApiError(404, 'Pedido não encontrado.')
    return order
  })),
  http.get('/api/orders/:id/receipt', endpoint(request => {
    const { owner } = scope(request, true)
    settle()
    const order = state.orders.find(o => o.userId === owner && o.id === new URL(request.url).pathname.split('/').at(-2))
    if (!order) throw new ApiError(404, 'Pedido não encontrado.')
    if (order.status !== 'confirmed') throw new ApiError(409, 'Recibo disponível somente após confirmação.')
    return order
  })),
]
