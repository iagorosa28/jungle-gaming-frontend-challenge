import type { NftUpdated, OrderUpdated } from '@/shared/contracts/spike'

type Event = NftUpdated | (OrderUpdated & { userId: string; sessionId?: string })
type Receiver = (event: Event, sessionId?: string) => void
const receivers = new Set<Receiver>()
export function subscribe(receiver: Receiver) { receivers.add(receiver); return () => { receivers.delete(receiver) } }
export function publish(event: Event, sessionId?: string) { for (const receiver of receivers) receiver(event, sessionId) }
