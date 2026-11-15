import { delay, http, HttpResponse, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import Decimal from 'decimal.js'
import { emitInputSchema, scenarioSchema, type NftUpdated } from '@/shared/contracts/spike'
import { createSnapshot } from './fixtures'
import { marketHandlers } from './market/handlers'
import { subscribe } from './market/events'
import { expire, state } from './market/store'

// Each document owns an isolated mock server. Refresh restores the same fixture.
let snapshot = createSnapshot()
let lastEvent: NftUpdated | undefined
// MSW 2.15 normalizes the Socket.IO transport path /socket.io/ to / when
// matching WebSocket handlers. Match the normalized default namespace.
const socketUrl = new URL('/', window.location.href)
socketUrl.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const channel = ws.link(socketUrl.href)
const clients = new Set<ReturnType<typeof toSocketIo>['client']>()

export const handlers = [
  ...marketHandlers,
  http.get('/api/spike', async ({ request }) => {
    const scenario = scenarioSchema.safeParse(new URL(request.url).searchParams.get('scenario') ?? 'success')
    if (!scenario.success) return HttpResponse.json({ message: 'Cenário inválido.' }, { status: 400 })
    await delay(scenario.data === 'slow' ? 1_600 : 300)
    if (scenario.data === 'error') {
      return HttpResponse.json({ message: 'Indisponibilidade simulada. Selecione Sucesso para recuperar.' }, { status: 503 })
    }
    return HttpResponse.json(snapshot)
  }),
  http.post('/api/spike/events', async ({ request }) => {
    const input = emitInputSchema.safeParse(await request.json())
    if (!input.success) return HttpResponse.json({ message: 'Entrega inválida.' }, { status: 400 })
    if (input.data.delivery === 'next') {
      snapshot = { ...snapshot, nft: {
        ...snapshot.nft,
        priceEth: new Decimal(snapshot.nft.priceEth).plus('0.01').toFixed(2),
        version: snapshot.nft.version + 1,
      } }
      lastEvent = {
        type: 'nft.updated', eventId: `nft-${snapshot.nft.id}-v${snapshot.nft.version}`,
        resourceId: snapshot.nft.id, version: snapshot.nft.version, nft: { ...snapshot.nft },
      }
    }
    if (!lastEvent) return HttpResponse.json({ message: 'Emita uma atualização antes de repetir.' }, { status: 409 })
    const event = input.data.delivery === 'stale'
      ? { ...lastEvent, eventId: 'old-event', version: 1, nft: createSnapshot().nft }
      : lastEvent
    // This is a Socket.IO event over the MSW WebSocket protocol binding.
    for (const client of clients) client.emit('nft.updated', event)
    return HttpResponse.json({ eventId: event.eventId, version: event.version })
  }),
  channel.addEventListener('connection', (connection) => {
    // npm 0.2.0 exports toSocketIo; the GitHub main API is different.
    // The binding supplies handshake/framing; this mock supplies heartbeat.
    const io = toSocketIo(connection)
    clients.add(io.client)
    const sessionId = new URL(connection.client.url).searchParams.get('sessionId')
    const unsubscribe = subscribe((event) => {
      expire()
      if (event.type === 'order.updated') {
        if (sessionId !== state.session.id || event.userId !== state.session.user?.id) return
        io.client.emit(event.type, { ...event, sessionId })
      } else io.client.emit(event.type, event)
    })
    const heartbeat = window.setInterval(() => connection.client.send('2'), 20_000)
    connection.client.addEventListener('close', () => {
      window.clearInterval(heartbeat)
      clients.delete(io.client)
      unsubscribe()
    })
  }),
]
