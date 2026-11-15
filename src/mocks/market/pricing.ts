import Decimal from 'decimal.js'
import type { Quote } from '@/shared/contracts/market'
import { cart, owner, save, state } from './store'
import { publish } from './events'

const eth = (value: Decimal) => value.toFixed(18)
export function updateNft(kind: 'price' | 'stock', broadcast = true) {
  const nft = state.catalog[0]
  if (kind === 'price') nft.priceEth = new Decimal(nft.priceEth).plus('0.10').toFixed(2)
  else nft.available = state.orders.filter(o => o.status === 'pending').flatMap(o => o.quote.lines)
    .filter(l => l.nftId === nft.id).reduce((sum, l) => sum + l.quantity, 0)
  nft.version++
  save()
  if (broadcast) publish({ type: 'nft.updated', eventId: `market-${nft.id}-${nft.version}`, resourceId: nft.id, version: nft.version, nft: { ...nft } })
}
export function quoteFingerprint(quote: Quote) {
  return JSON.stringify({ revision: quote.revision, lines: quote.lines, subtotal: quote.subtotalEth, discount: quote.discountEth, fee: quote.feeEth, total: quote.totalEth, valid: quote.valid })
}
export function quote() {
  const current = cart()
  const issues: string[] = []
  if (!current.items.length) issues.push('O carrinho está vazio.')
  const lines = current.items.flatMap(item => {
    const nft = state.catalog.find(n => n.id === item.nftId && n.edition === item.edition)
    if (!nft) { issues.push('Edição inexistente. Remova o item.'); return [] }
    // Pending orders reserve inventory until their terminal transition.
    const reserved = state.orders.filter(o => o.status === 'pending').flatMap(o => o.quote.lines)
      .filter(l => l.nftId === item.nftId).reduce((sum, l) => sum + l.quantity, 0)
    if (item.quantity > nft.available - reserved) issues.push(`${nft.name}: quantidade indisponível. Ajuste o carrinho.`)
    return [{ ...item, name: nft.name, priceEth: nft.priceEth, version: nft.version, lineTotalEth: eth(new Decimal(nft.priceEth).times(item.quantity)) }]
  })
  const subtotal = lines.reduce((sum, line) => sum.plus(line.lineTotalEth), new Decimal(0))
  const fee = new Decimal(lines.length ? '0.006' : '0')
  const result: Quote = {
    id: crypto.randomUUID(), revision: current.revision, lines, subtotalEth: eth(subtotal), discountEth: eth(new Decimal(0)), feeEth: eth(fee), totalEth: eth(subtotal.plus(fee)),
    valid: issues.length === 0, issues, expiresAt: Date.now() + 120_000,
  }
  // Bound persisted quote history; orders keep their own immutable snapshots.
  for (const [id, entry] of Object.entries(state.quotes)) if (entry.quote.expiresAt < Date.now()) delete state.quotes[id]
  state.quotes[result.id] = { owner: owner(), quote: structuredClone(result) }
  save()
  return result
}
