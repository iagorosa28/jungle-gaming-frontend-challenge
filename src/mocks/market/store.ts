import { z } from 'zod'
import { cartSchema, catalogNftSchema, orderSchema, quoteSchema, scenarioSchema, sessionSchema, userSchema } from '@/shared/contracts/market'
import { catalog } from './fixtures'

const storedUserSchema = userSchema.extend({ salt: z.string(), digest: z.string().regex(/^[a-f0-9]{64}$/) })
const stateSchema = z.object({
  format: z.literal(1), scenario: scenarioSchema, session: sessionSchema,
  users: z.array(storedUserSchema), catalog: z.array(catalogNftSchema),
  carts: z.record(z.string(), cartSchema), quotes: z.record(z.string(), z.object({ owner: z.string(), quote: quoteSchema })),
  orders: z.array(orderSchema), triggered: z.boolean(),
})
export type State = z.infer<typeof stateSchema>
const storageKey = 'jungle.mock.market.v1'
export const emptyCart = () => ({ items: [], revision: 0 })
export const guestSession = () => ({ id: crypto.randomUUID(), user: null, expiresAt: null })
function initial(): State {
  return {
    format: 1, scenario: 'success', session: guestSession(), catalog: structuredClone(catalog),
    users: [
      { id: 'ana', name: 'Ana Demo', email: 'ana@example.test', salt: 'demo-ana', digest: 'd6b2432b78669d19b9096a73be351024fb883c346c252ba2f67fa05d7acd7237' },
      { id: 'bruno', name: 'Bruno Demo', email: 'bruno@example.test', salt: 'demo-bruno', digest: '8a6e4109dc1225acd01e19f19426b93ef26fd063bc99671395c119f5ca97333f' },
    ], carts: { guest: emptyCart(), ana: emptyCart(), bruno: emptyCart() }, quotes: {}, orders: [], triggered: false,
  }
}
function restore(): State {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) { const parsed = stateSchema.safeParse(JSON.parse(raw)); if (parsed.success) return parsed.data }
  } catch { /* Invalid persisted demo state is replaced by deterministic fixtures. */ }
  return initial()
}
export let state = restore()
export function save() { localStorage.setItem(storageKey, JSON.stringify(state)) }
export function reset(scenario: State['scenario']) { state = initial(); state.scenario = scenario; save() }
export function owner() { return state.session.user?.id ?? 'guest' }
export function cart() { return state.carts[owner()] ??= emptyCart() }
export function expire() {
  if (state.session.expiresAt !== null && state.session.expiresAt <= Date.now()) { state.session = guestSession(); save() }
}
export async function digest(password: string, salt: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${password}`))
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('')
}
export function publicUser(user: State['users'][number]) { return userSchema.parse(user) }
