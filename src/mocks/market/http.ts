import { HttpResponse, type JsonBodyType } from 'msw'
import { cart, expire, owner, state } from './store'

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'INVALID_REQUEST') { super(message) }
}
export function scope(request: Request, privateOnly = false) {
  expire()
  if (request.headers.get('X-Mock-Session') !== state.session.id || (privateOnly && !state.session.user)) {
    throw new ApiError(401, 'Sessão encerrada. Entre novamente para continuar.', 'SESSION_EXPIRED')
  }
  return { owner: owner(), cart: cart(), session: state.session }
}
export function endpoint(handler: (request: Request) => JsonBodyType | Promise<JsonBodyType>) {
  return async ({ request }: { request: Request }) => {
    try { return HttpResponse.json(await handler(request)) }
    catch (error) {
      if (error instanceof ApiError) return HttpResponse.json({ message: error.message, code: error.code }, { status: error.status })
      if (error instanceof SyntaxError || (error instanceof Error && error.name === 'ZodError')) return HttpResponse.json({ message: 'Dados inválidos. Revise os campos.', code: 'VALIDATION' }, { status: 400 })
      throw error
    }
  }
}
