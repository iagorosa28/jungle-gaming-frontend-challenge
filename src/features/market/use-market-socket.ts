import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { z } from 'zod'
import { nftUpdatedSchema, orderUpdatedSchema } from '@/shared/contracts/spike'
import type { CatalogNft, CatalogResponse, Order, Quote, Session } from '@/shared/contracts/market'
import { marketKey } from './api'

const privateEventSchema = orderUpdatedSchema.extend({ userId: z.string(), sessionId: z.string() })
export function useMarketSocket(session: Session) {
  const client = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState('')
  const [ignored, setIgnored] = useState(0)
  const [received, setReceived] = useState(0)
  useEffect(() => {
    const socket = io(window.location.origin, { path: '/socket.io/', transports: ['websocket'], query: { sessionId: session.id }, autoConnect: false, reconnectionAttempts: 3, reconnectionDelay: 500, randomizationFactor: 0 })
    socketRef.current = socket
    let active = true
    const versions = new Map<string, number>()
    const seen = new Set<string>()
    const reconcile = () => { if (active) void client.invalidateQueries({ queryKey: marketKey(session.id) }) }
    function receive(raw: unknown, type: 'nft.updated' | 'order.updated') {
      if (!active) return
      const result = (type === 'nft.updated' ? nftUpdatedSchema : privateEventSchema).safeParse(raw)
      if (!result.success) return
      const event = result.data
      if ('userId' in event && (event.userId !== session.user?.id || event.sessionId !== session.id)) return
      const resource = `${type}:${event.resourceId}`
      const rest = type === 'nft.updated'
        ? [
          ...client.getQueriesData<CatalogResponse>({ queryKey: [...marketKey(session.id), 'catalog'] }).flatMap(([, data]) => data?.items.filter(n => n.id === event.resourceId).map(n => n.version) ?? []),
          ...client.getQueriesData<CatalogNft>({ queryKey: [...marketKey(session.id), 'nft', event.resourceId] }).map(([, data]) => data?.version ?? 0),
          ...client.getQueriesData<Quote>({ queryKey: [...marketKey(session.id), 'quote'] }).flatMap(([, data]) => data?.lines.filter(n => n.nftId === event.resourceId).map(n => n.version) ?? []),
        ]
        : [
          ...client.getQueriesData<Order>({ queryKey: [...marketKey(session.id), 'order', event.resourceId] }).map(([, data]) => data?.version ?? 0),
          ...client.getQueriesData<Order[]>({ queryKey: [...marketKey(session.id), 'orders'] }).flatMap(([, data]) => data?.filter(o => o.id === event.resourceId).map(o => o.version) ?? []),
        ]
      if (seen.has(event.eventId) || event.version <= Math.max(versions.get(resource) ?? 0, ...rest)) { setIgnored(n => n + 1); return }
      seen.add(event.eventId)
      versions.set(resource, event.version)
      setReceived(n => n + 1)
      setNotice(type === 'nft.updated' ? 'Preço ou disponibilidade atualizados. Revise sua cotação.' : 'Estado do pedido atualizado pelo Socket.IO.')
      reconcile()
    }
    socket.on('connect', () => { setConnected(true); reconcile() })
    socket.on('disconnect', () => { if (active) setConnected(false) })
    socket.on('connect_error', () => { if (active) setConnected(false) })
    socket.on('nft.updated', raw => receive(raw, 'nft.updated'))
    socket.on('order.updated', raw => receive(raw, 'order.updated'))
    socket.connect()
    return () => { active = false; socket.removeAllListeners(); socket.disconnect(); socketRef.current = null }
  }, [client, session.id, session.user?.id])
  return { connected, notice, ignored, received, toggle: () => { if (socketRef.current?.connected) socketRef.current.disconnect(); else socketRef.current?.connect() } }
}
