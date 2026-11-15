import { useQuery } from '@tanstack/react-query'
import { session, sessionKey } from './api'
export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: ({ signal }) => session(signal), refetchInterval: 15_000 })
}
export function safeReturn(value: unknown) {
  return typeof value === 'string' && /^\/(checkout|cart|orders(?:\/[a-zA-Z0-9-]+)?|nfts\/[a-zA-Z0-9-]+)$/.test(value) ? value : '/checkout'
}
