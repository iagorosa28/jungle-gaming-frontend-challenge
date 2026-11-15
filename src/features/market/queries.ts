import { useQuery } from '@tanstack/react-query'
import type { Session } from '@/shared/contracts/market'
import { marketApi, marketKey } from './api'

export function useCart(session: Session) { const api = marketApi(session.id); return useQuery({ queryKey: [...marketKey(session.id), 'cart'], queryFn: ({ signal }) => api.cart(signal) }) }
export function useQuote(session: Session) { const api = marketApi(session.id); return useQuery({ queryKey: [...marketKey(session.id), 'quote'], queryFn: ({ signal }) => api.quote(signal) }) }
