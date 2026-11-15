import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { nftUpdatedSchema, orderUpdatedSchema, type RealtimeEvent, type ServerEvents, type Snapshot } from '@/shared/contracts/spike'
import { spikeKeys } from './api'

type Connection = 'connecting' | 'connected' | 'disconnected' | 'error'

export function useSpikeSocket() {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket<ServerEvents> | null>(null)
  const [connection, setConnection] = useState<Connection>('connecting')
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [ignored, setIgnored] = useState(0)
  const [invalid, setInvalid] = useState(0)

  useEffect(() => {
    const socket: Socket<ServerEvents> = io(window.location.origin, {
      path: '/socket.io/',
      transports: ['websocket'],
      autoConnect: false,
      reconnectionAttempts: 3,
      reconnectionDelay: 500,
      randomizationFactor: 0,
      timeout: 4_000,
    })
    socketRef.current = socket
    const versions = new Map<string, number>()
    const seen = new Set<string>()
    let active = true
    const reconcile = () => { void queryClient.invalidateQueries({ queryKey: spikeKeys.all }) }
    const receive = (raw: unknown, type: 'nft.updated' | 'order.updated') => {
      if (!active) return
      const result = (type === 'nft.updated' ? nftUpdatedSchema : orderUpdatedSchema).safeParse(raw)
      if (!result.success) { setInvalid((count) => count + 1); return }
      const event = result.data
      const key = `${type}:${event.resourceId}`
      const restVersions = type === 'nft.updated'
        ? queryClient.getQueriesData<Snapshot>({ queryKey: spikeKeys.all })
          .flatMap(([, data]) => data?.nft.id === event.resourceId ? [data.nft.version] : [])
        : []
      const currentVersion = Math.max(versions.get(key) ?? 0, ...restVersions)
      if (seen.has(event.eventId) || event.version <= currentVersion) {
        setIgnored((count) => count + 1)
        return
      }
      seen.add(event.eventId)
      versions.set(key, event.version)
      setEvents((previous) => [event, ...previous].slice(0, 5))
      // REST remains authoritative. No mutation result is copied into Query.
      reconcile()
    }
    const onNft: ServerEvents['nft.updated'] = (event) => receive(event, 'nft.updated')
    const onOrder: ServerEvents['order.updated'] = (event) => receive(event, 'order.updated')
    const onConnect = () => { setConnection('connected'); reconcile() }
    const onDisconnect = () => { setConnection('disconnected') }
    const onError = () => { setConnection('error') }
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onError)
    socket.on('nft.updated', onNft)
    socket.on('order.updated', onOrder)
    socket.connect()
    return () => {
      active = false
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onError)
      socket.off('nft.updated', onNft)
      socket.off('order.updated', onOrder)
      socket.disconnect()
      socketRef.current = null
    }
  }, [queryClient])

  return {
    connection, events, ignored, invalid,
    toggleConnection: () => {
      const socket = socketRef.current
      if (socket?.connected) socket.disconnect()
      else socket?.connect()
    },
  }
}
