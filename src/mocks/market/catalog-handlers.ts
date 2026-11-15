import { http } from 'msw'
import { itemSchema } from '@/shared/contracts/market'
import { ApiError, endpoint, scope } from './http'
import { save, state } from './store'
import { quote } from './pricing'
import { wallets } from './fixtures'

export const catalogHandlers = [
  http.get('/api/nfts', endpoint(() => state.catalog)),
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
