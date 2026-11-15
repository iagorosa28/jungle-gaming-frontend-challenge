import type { Order } from '@/shared/contracts/market'
import { publish } from './events'
import { save, state } from './store'

function event(order: Order) {
  return { type: 'order.updated' as const, eventId: `${order.id}-v${order.version}`, resourceId: order.id, version: order.version, status: order.status, userId: order.userId }
}
export function emitOrder(order: Order, stale = false) {
  const value = event(order)
  publish(stale ? { ...value, eventId: `${order.id}-v1`, version: 1, status: 'pending' } : value)
}
export function settle(force = false) {
  for (const order of state.orders) {
    if (order.status !== 'pending' || (!force && order.resolveAt > Date.now())) continue
    order.status = order.outcome
    order.version++
    if (order.status === 'confirmed') {
      order.transaction = `simulated-${order.id}`
      for (const line of order.quote.lines) {
        const nft = state.catalog.find(n => n.id === line.nftId)!
        nft.available -= line.quantity
        nft.version++
        const userCart = state.carts[order.userId]
        const item = userCart.items.find(i => i.nftId === line.nftId && i.edition === line.edition)
        if (item) item.quantity -= Math.min(line.quantity, item.quantity)
        userCart.items = userCart.items.filter(i => i.quantity > 0)
        userCart.revision++
        publish({ type: 'nft.updated', eventId: `market-${nft.id}-${nft.version}`, resourceId: nft.id, version: nft.version, nft: { ...nft } })
      }
    }
    save()
    emitOrder(order)
  }
}
export function schedule(order: Order) {
  window.setTimeout(() => settle(), Math.max(0, order.resolveAt - Date.now()) + 1)
}
// Refresh resumes pending work using persisted deadlines, not a new purchase.
export function resumeOrders() { settle(); for (const order of state.orders.filter(o => o.status === 'pending')) schedule(order) }
