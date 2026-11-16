import { http } from 'msw'
import { demoInputSchema } from '@/shared/contracts/market'
import { sessionHandlers } from './session-handlers'
import { catalogHandlers } from './catalog-handlers'
import { orderHandlers } from './order-handlers'
import { endpoint } from './http'
import { reset, save, state } from './store'
import { updateNft } from './pricing'
import { emitOrder, resumeOrders, settle } from './orders'

resumeOrders()
export const marketHandlers = [
  ...sessionHandlers, ...catalogHandlers, ...orderHandlers,
  http.post('/api/demo', endpoint(async request => {
    const input = demoInputSchema.parse(await request.json())
    if (input.action === 'reset') reset(input.scenario)
    else if (input.action === 'network') { state.networkConditions = { catalog: input.catalog, loginDelayMs: input.loginDelayMs }; save() }
    else if (input.action === 'price' || input.action === 'stock') updateNft(input.action, input.broadcast)
    else if (input.action === 'expire') { state.session.expiresAt = Date.now() - 1; save() }
    else if (input.action === 'settle') settle(true)
    else for (const order of state.orders) emitOrder(order, input.action === 'stale')
    return { scenario: state.scenario }
  })),
]
