import { delay, http } from 'msw'
import { loginSchema, registerSchema } from '@/shared/contracts/market'
import { ApiError, endpoint, scope } from './http'
import { digest, emptyCart, expire, guestSession, publicUser, save, state } from './store'

export const sessionHandlers = [
  http.get('/api/session', endpoint(() => { expire(); return state.session })),
  ...(['login', 'register'] as const).map(action => http.post(`/api/session/${action}`, endpoint(async request => {
    scope(request)
    const scopeId = state.session.id
    await delay(state.networkConditions.loginDelayMs)
    const raw = await request.json()
    const input = loginSchema.parse(raw)
    let user = state.users.find(u => u.email === input.email)
    if (action === 'register') {
      const registration = registerSchema.parse(raw)
      if (user) throw new ApiError(409, 'Este e-mail já está cadastrado.')
      const salt = crypto.randomUUID()
      user = { id: crypto.randomUUID(), name: registration.name, email: input.email, salt, digest: await digest(input.password, salt) }
      if (scopeId !== state.session.id) throw new ApiError(409, 'A sessão mudou. Tente novamente.')
      state.users.push(user)
    } else if (!user || user.digest !== await digest(input.password, user.salt)) {
      throw new ApiError(401, 'E-mail ou senha inválidos.', 'INVALID_CREDENTIALS')
    }
    if (scopeId !== state.session.id) throw new ApiError(409, 'A sessão mudou. Tente novamente.')
    const target = state.carts[user.id] ??= emptyCart()
    for (const item of state.carts.guest.items) {
      const existing = target.items.find(i => i.nftId === item.nftId && i.edition === item.edition)
      if (existing) existing.quantity = Math.min(10, existing.quantity + item.quantity)
      else target.items.push({ ...item })
    }
    target.revision++
    state.carts.guest = emptyCart()
    state.session = { id: crypto.randomUUID(), user: publicUser(user), expiresAt: Date.now() + 30 * 60_000 }
    save()
    return state.session
  }))),
  http.post('/api/session/logout', endpoint(request => { scope(request); state.session = guestSession(); save(); return state.session })),
]
