import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Activity, ArrowDown, ArrowRight, Check, Code2, Database, Radio, RefreshCw, Unplug } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { Scenario } from '@/shared/contracts/spike'
import { formatEth } from '@/shared/lib/eth'
import { requestUpdate, snapshotOptions } from './api'
import { useSpikeSocket } from './use-spike-socket'

const scenarios: { value: Scenario; label: string }[] = [
  { value: 'success', label: 'Sucesso' },
  { value: 'slow', label: 'Lento' },
  { value: 'error', label: 'Erro HTTP' },
]
const connectionLabels = {
  connecting: 'Conectando…', connected: 'Conectado', disconnected: 'Desconectado', error: 'Falha de conexão',
}

export function SpikePage({ scenario }: { scenario: Scenario }) {
  const snapshot = useQuery(snapshotOptions(scenario))
  const realtime = useSpikeSocket()
  const update = useMutation({ mutationFn: requestUpdate, retry: false })

  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl px-5 pb-12 pt-10 sm:px-9 sm:pt-16">
      <div className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-primary">
        <span className="h-px w-8 bg-primary" /> Marketplace / Fundação técnica
      </div>
      <div className="flex flex-col justify-between gap-6 border-b border-border pb-9 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Primeiro, a conexão.<br /><span className="text-primary">Depois, o marketplace.</span></h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">Uma base executável para o Jungle Gaming. Explore uma resposta REST e acompanhe um evento em tempo real, com dados inteiramente fictícios.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-border px-3 py-2 text-xs text-muted-foreground"><Code2 className="size-4 text-primary" aria-hidden="true" /> Spike técnico · v0.1</span>
      </div>

      <nav aria-label="Cenário da API" className="my-7 flex flex-wrap items-center gap-2">
        <span className="mr-3 w-full pb-1 text-xs uppercase tracking-widest text-muted-foreground sm:w-auto sm:pb-0">Cenário REST</span>
        {scenarios.map(({ value, label }) => (
          <Button key={value} asChild variant={scenario === value ? 'default' : 'outline'}>
            <Link to="/spike" search={{ scenario: value }} aria-current={scenario === value ? 'page' : undefined}>{label}</Link>
          </Button>
        ))}
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card aria-labelledby="rest-heading" className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-3"><Database className="size-5 text-primary" aria-hidden="true" /><h2 id="rest-heading" className="text-lg font-semibold">Consulta REST</h2></span>
            <span className="text-xs text-muted-foreground">01</span>
          </div>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">Axios → MSW → TanStack Query</p>
          <div className="mt-5 min-h-64 rounded-xl border border-border bg-background/60 p-5" aria-live="polite" aria-busy={snapshot.isFetching}>
            {snapshot.isPending ? (
              <div role="status" aria-label="Carregando resposta REST">
                <p className="mb-6 text-sm text-muted-foreground">Carregando resposta REST…</p>
                <Skeleton className="mb-3 h-6 w-4/5" /><Skeleton className="mb-8 h-10 w-1/2" /><Skeleton className="h-5 w-2/3" />
              </div>
            ) : snapshot.isError ? (
              <div role="alert" className="flex min-h-52 flex-col items-start justify-center gap-4">
                <span className="text-sm font-semibold text-destructive">Falha na consulta REST</span>
                <p className="text-sm leading-6 text-muted-foreground">A API não retornou uma resposta válida. No cenário Erro HTTP, o MSW responde com status 503.</p>
                <Button variant="outline" onClick={() => { void snapshot.refetch() }} disabled={snapshot.isFetching}><RefreshCw aria-hidden="true" />Tentar novamente</Button>
              </div>
            ) : (
              <div data-testid="rest-result">
                <div className="mb-5 flex items-center gap-2 text-xs text-success"><Check className="size-4" aria-hidden="true" /> Resposta recebida · {snapshot.data.source}</div>
                <h3 className="text-xl font-semibold">{snapshot.data.nft.name}</h3>
                <p data-testid="nft-price" className="mt-3 text-3xl font-semibold tracking-tight text-primary">{formatEth(snapshot.data.nft.priceEth)}</p>
                <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-border pt-4 text-xs">
                  <div><dt className="text-muted-foreground">Disponíveis</dt><dd className="mt-2">{snapshot.data.nft.available} unidades</dd></div>
                  <div><dt className="text-muted-foreground">Versão REST</dt><dd data-testid="rest-version" className="mt-2">v{snapshot.data.nft.version}</dd></div>
                </dl>
              </div>
            )}
          </div>
          <div className="mt-4 flex min-h-11 items-center justify-between gap-2">
            <code className="text-xs text-muted-foreground">GET /api/spike</code>
            <Button variant="ghost" onClick={() => { void snapshot.refetch() }} disabled={snapshot.isFetching}><RefreshCw aria-hidden="true" />Consultar</Button>
          </div>
          <p role="status" className="mt-2 min-h-5 text-xs text-muted-foreground">{snapshot.isFetching && !snapshot.isPending ? 'Atualizando via REST…' : 'O cenário selecionado permanece na URL.'}</p>
        </Card>

        <Card aria-labelledby="socket-heading" className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-3"><Radio className="size-5 text-primary" aria-hidden="true" /><h2 id="socket-heading" className="text-lg font-semibold">Tempo real</h2></span>
            <span className="text-xs text-muted-foreground">02</span>
          </div>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">MSW → Socket.IO → cliente → nova consulta REST</p>
          <div className="mt-5 min-h-64 rounded-xl border border-border bg-background/60 p-5">
            <p role="status" className="flex items-center gap-2 text-xs"><span className={`size-2 rounded-full ${realtime.connection === 'connected' ? 'bg-success' : 'bg-primary'}`} /><span data-testid="socket-status">{connectionLabels[realtime.connection]}</span><span className="ml-auto text-muted-foreground">WebSocket</span></p>
            <div aria-live="polite" aria-atomic="true" className="mt-6">
              {realtime.events.length === 0 ? (
                <div className="flex min-h-36 flex-col justify-center">
                  <Activity className="mb-3 size-6 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm">Aguardando o primeiro evento</p>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">Emita uma atualização para alterar o preço fictício em 0,01 ETH no servidor simulado.</p>
                </div>
              ) : (
                <div data-testid="socket-event">
                  <p className="text-sm text-success">Evento recebido pelo socket.io-client</p>
                  <p className="mt-3 font-semibold text-primary">{realtime.events[0].type}</p>
                  <dl className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div><dt className="inline">ID: </dt><dd className="inline break-all">{realtime.events[0].eventId}</dd></div>
                    <div><dt className="inline">Recurso: </dt><dd className="inline">{realtime.events[0].resourceId}</dd></div>
                    <div><dt className="inline">Versão: </dt><dd data-testid="event-version" className="inline">v{realtime.events[0].version}</dd></div>
                  </dl>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => update.mutate()} disabled={realtime.connection !== 'connected' || update.isPending}><ArrowRight aria-hidden="true" />Emitir atualização</Button>
            <Button variant="outline" onClick={realtime.toggleConnection} disabled={realtime.connection === 'connecting'}><Unplug aria-hidden="true" />{realtime.connection === 'connected' ? 'Desconectar' : 'Reconectar'}</Button>
          </div>
          {update.isError ? <p role="alert" className="mt-3 text-xs text-destructive">Não foi possível solicitar o evento. Tente novamente.</p> : null}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">No histórico: <span data-testid="event-count">{realtime.events.length}</span> · Ignorados: <span data-testid="ignored-count">{realtime.ignored}</span> · Inválidos: {realtime.invalid}</p>
        </Card>
      </div>

      <div className="mt-8 rounded-xl border border-border px-5 py-5 sm:px-7">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground">O caminho dos dados</h2>
        <p className="mt-4 flex flex-wrap items-center gap-3 text-xs leading-6"><span>Requisição Axios</span><ArrowRight className="size-4 text-primary" aria-hidden="true" /><span>Handler MSW</span><ArrowRight className="size-4 text-primary" aria-hidden="true" /><span>Transporte Socket.IO</span><ArrowRight className="size-4 text-primary" aria-hidden="true" /><span>Reconciliação REST</span></p>
      </div>
      <p className="mt-5 flex items-start gap-2 text-xs leading-6 text-muted-foreground"><ArrowDown className="mt-1 size-4 shrink-0" aria-hidden="true" />Recarregar a página restaura os dados iniciais. Esta etapa valida as integrações; catálogo e compra serão implementados nas próximas entregas.</p>
    </main>
  )
}
