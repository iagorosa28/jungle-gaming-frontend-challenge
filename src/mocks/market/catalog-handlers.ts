import { delay, http, HttpResponse } from 'msw'
import Decimal from 'decimal.js'
import { catalogSearchSchema, itemSchema } from '@/shared/contracts/market'
import { ApiError, endpoint, scope } from './http'
import { save, state } from './store'
import { quote } from './pricing'
import { wallets } from './fixtures'

export const catalogHandlers = [
  http.get('/api/nfts', async ({ request }) => {
    const mode = state.networkConditions.catalog
    if (mode === 'network-error') return HttpResponse.error()
    if (mode === 'http-error') return HttpResponse.json({ message: 'Catálogo temporariamente indisponível.', code: 'CATALOG_UNAVAILABLE' }, { status: 503 })
    return endpoint(async request => {
      const input = catalogSearchSchema.parse(Object.fromEntries(new URL(request.url).searchParams))
      const text = input.q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      const items = state.catalog.filter(nft =>
        (!text || `${nft.name} ${nft.description}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(text)) &&
        (!input.category || nft.category === input.category) && (!input.network || nft.network === input.network) &&
        (input.min === undefined || new Decimal(nft.priceEth).gte(input.min)) && (input.max === undefined || new Decimal(nft.priceEth).lte(input.max)))
        .sort((a, b) => (input.sort === 'recent' ? b.listedAt - a.listedAt : new Decimal(a.priceEth).cmp(b.priceEth) * (input.sort === 'price-desc' ? -1 : 1)) || a.id.localeCompare(b.id))
      const pages = Math.ceil(items.length / 9)
      const page = Math.min(input.page, Math.max(1, pages))
      // Snapshot before latency makes out-of-order responses reproducible.
      const response = structuredClone({ items: items.slice((page - 1) * 9, page * 9), total: items.length, page, pageSize: 9, pages })
      await delay(mode === 'slow' ? 1200 : mode === 'out-of-order' ? (input.q.length <= 1 ? 1500 : 100) : 80)
      return response
    })({ request })
  }),
  http.get('/api/nfts/:id', endpoint(request => {
    const id = new URL(request.url).pathname.split('/').at(-1)
    const nft = state.catalog.find(n => n.id === id)
    if (!nft) throw new ApiError(404, 'NFT não encontrado.')
    return nft
  })),
  http.get('/api/cart', endpoint(request => scope(request).cart)),
  ...(['post', 'put'] as const).map(method => http[method]('/api/cart/items', endpoint(async request => {
    const input = itemSchema.parse(await request.json())
    const { cart } = scope(request)
    const nft = state.catalog.find(n => n.id === input.nftId && n.edition === input.edition)
    if (!nft) throw new ApiError(404, 'Edição não encontrada.')
    const existing = cart.items.find(i => i.nftId === input.nftId && i.edition === input.edition)
    const quantity = method === 'post' ? input.quantity + (existing?.quantity ?? 0) : input.quantity
    if (quantity > nft.available || quantity > 10) throw new ApiError(409, 'Quantidade indisponível. O carrinho foi preservado.')
    if (existing) existing.quantity = quantity
    else cart.items.push({ ...input, quantity })
    cart.revision++
    save()
    return cart
  }))),
  http.delete('/api/cart/items/:id', endpoint(request => {
    const { cart } = scope(request)
    const id = new URL(request.url).pathname.split('/').at(-1)
    cart.items = cart.items.filter(i => i.nftId !== id)
    cart.revision++
    save()
    return cart
  })),
  http.post('/api/quotes', endpoint(request => { scope(request); return quote() })),
  http.get('/api/wallets', endpoint(request => { scope(request, true); return wallets })),
]
