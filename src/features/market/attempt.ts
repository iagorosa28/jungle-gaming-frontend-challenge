import { attemptSchema, type Attempt } from '@/shared/contracts/market'

const key = (userId: string) => `jungle.attempt.${userId}`
export function readAttempt(userId: string): Attempt | null {
  try { return attemptSchema.parse(JSON.parse(sessionStorage.getItem(key(userId)) ?? 'null')) }
  catch { sessionStorage.removeItem(key(userId)); return null }
}
export function saveAttempt(userId: string, attempt: Attempt) { sessionStorage.setItem(key(userId), JSON.stringify(attemptSchema.parse(attempt))) }
export function clearAttempt(userId: string) { sessionStorage.removeItem(key(userId)) }
