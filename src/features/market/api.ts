import axios from 'axios'
import { z } from 'zod'
import { http } from '@/shared/api/http'
import { cartSchema, catalogNftSchema, catalogResponseSchema, orderSchema, quoteSchema, sessionSchema, walletSchema, type Attempt, type DemoInput, type CatalogSearch } from '@/shared/contracts/market'

export const marketKey = (scope: string) => ['market', scope] as const
export const sessionKey = ['session'] as const
export function message(error: unknown) { return axios.isAxiosError(error) ? error.response?.data?.message ?? 'Falha de conexão. Tente novamente.' : error instanceof Error ? error.message : 'Não foi possível concluir.' }
export function errorCode(error: unknown) { return axios.isAxiosError(error) ? error.response?.data?.code : undefined }
export async function session(signal?: AbortSignal) { return sessionSchema.parse((await http.get('/session', { signal })).data) }
export function marketApi(scope: string) {
  const config = { headers: { 'X-Mock-Session': scope } }
  async function run<T>(operation: Promise<{ data: unknown }>, schema: z.ZodType<T>) {
    try { return schema.parse((await operation).data) }
    catch (error) {
      if (errorCode(error) === 'SESSION_EXPIRED') window.dispatchEvent(new Event('market:session-expired'))
      throw error
    }
  }
  return {
    catalog: (params: CatalogSearch, signal?: AbortSignal) => run(http.get('/nfts', { params, signal }), catalogResponseSchema),
    nft: (id: string, signal?: AbortSignal) => run(http.get(`/nfts/${id}`, { signal }), catalogNftSchema),
    cart: (signal?: AbortSignal) => run(http.get('/cart', { ...config, signal }), cartSchema),
    editCart: (input: { nftId: string; edition: 'standard'; quantity: number; mode: 'add' | 'update' | 'remove' }) => run(
      input.mode === 'remove' ? http.delete(`/cart/items/${input.nftId}`, config) : http[input.mode === 'add' ? 'post' : 'put']('/cart/items', input, config), cartSchema),
    quote: (signal?: AbortSignal) => run(http.post('/quotes', {}, { ...config, signal }), quoteSchema),
    wallets: (signal?: AbortSignal) => run(http.get('/wallets', { ...config, signal }), z.array(walletSchema)),
    login: (input: unknown, register: boolean) => run(http.post(`/session/${register ? 'register' : 'login'}`, input, config), sessionSchema),
    logout: () => run(http.post('/session/logout', {}, config), sessionSchema),
    createOrder: (attempt: Attempt) => run(http.post('/orders', attempt.input, { headers: { ...config.headers, 'Idempotency-Key': attempt.key } }), orderSchema),
    recover: (key: string) => run(http.get(`/orders/by-key/${key}`, config), orderSchema),
    orders: (signal?: AbortSignal) => run(http.get('/orders', { ...config, signal }), z.array(orderSchema)),
    order: (id: string, signal?: AbortSignal) => run(http.get(`/orders/${id}`, { ...config, signal }), orderSchema),
    receipt: (id: string, signal?: AbortSignal) => run(http.get(`/orders/${id}/receipt`, { ...config, signal }), orderSchema),
    demo: (input: DemoInput) => run(http.post('/demo', input), z.object({ scenario: z.string() })),
  }
}
