import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/shared/components/ui/button'
import { scenarioSchema, networkConditionsSchema, type DemoInput } from '@/shared/contracts/market'
import { demoKey, marketApi, sessionKey } from './api'
import { useSession } from './session'
import { Failure, Loading } from './components'

export function DemoPage() {
  const session = useSession().data!
  const client = useQueryClient()
  const router = useRouter()
  const query = useQuery({ queryKey: demoKey, queryFn: ({ signal }) => marketApi(session.id).demoState(signal) })
  const mutation = useMutation({ mutationKey: [session.id, 'demo'], mutationFn: (input: DemoInput) => marketApi(session.id).demo(input), onSuccess: async (_, input) => {
    await client.invalidateQueries({ queryKey: demoKey })
    if (input.action === 'reset') {
      // Remove only this application's authorized attempts, preserving unrelated storage.
      for (const key of Object.keys(sessionStorage)) if (key.startsWith('jungle.attempt.')) sessionStorage.removeItem(key)
      await client.cancelQueries({ queryKey: ['market'] }); client.removeQueries({ queryKey: ['market'] })
      await client.invalidateQueries({ queryKey: sessionKey })
      await router.navigate({ to: '/' })
    } else if (input.action === 'network') await client.invalidateQueries({ queryKey: ['market'] })
    else if (input.action === 'expire') await client.invalidateQueries({ queryKey: sessionKey })
  } })
  if (query.isPending) return <Loading />
  if (query.isError) return <Failure error={query.error} retry={query.refetch} />
  const conditions = query.data.networkConditions
  return <>
    <h1 className="page-title">Cenários da demonstração</h1>
    <p className="mb-6 text-muted-foreground">Controles da API fictícia. Restaurar um cenário apaga contas cadastradas, carrinhos, pedidos e sessões desta demonstração.</p>
    <form key={query.data.scenario} className="panel space-y-5" onSubmit={event => {
      event.preventDefault()
      mutation.mutate({ action: 'reset', scenario: scenarioSchema.parse(new FormData(event.currentTarget).get('scenario')) })
    }}>
      <label className="form-label" htmlFor="demo-scenario">Cenário</label>
      <select id="demo-scenario" name="scenario" className="field w-full" defaultValue={query.data.scenario} disabled={mutation.isPending}>
        {scenarioSchema.options.map(scenario => <option key={scenario}>{scenario}</option>)}
      </select>
      <Button disabled={mutation.isPending}>Restaurar cenário</Button>
    </form>
    <form key={JSON.stringify(conditions)} className="panel mt-6 space-y-5" onSubmit={event => {
      event.preventDefault()
      const values = new FormData(event.currentTarget)
      mutation.mutate({ action: 'network', ...networkConditionsSchema.parse({ catalog: values.get('catalog'), loginDelayMs: Number(values.get('loginDelayMs')) }) })
    }}>
      <h2>Condições de rede</h2>
      <label className="form-label" htmlFor="demo-catalog">Rede do catálogo</label>
      <select id="demo-catalog" name="catalog" className="field w-full" defaultValue={conditions.catalog} disabled={mutation.isPending}>
        {networkConditionsSchema.shape.catalog.unwrap().options.map(mode => <option key={mode}>{mode}</option>)}
      </select>
      <label className="form-label" htmlFor="demo-login-delay">Latência do login (ms)</label>
      <input id="demo-login-delay" type="number" min="0" max="3000" required defaultValue={conditions.loginDelayMs} name="loginDelayMs" className="field w-full" disabled={mutation.isPending} />
      <Button disabled={mutation.isPending}>Aplicar condições</Button>
      <p className="text-sm text-muted-foreground">Seleção carregada da API e preservada após navegação e refresh. Enquanto uma falha estiver forçada, tentar novamente continuará falhando. Restaurar cenário retorna à rede normal e latência zero.</p>
    </form>
    <section className="panel mt-6 space-y-4">
      <h2>Alterações durante a compra</h2>
      <p className="text-sm text-muted-foreground">Preço e estoque alteram o primeiro NFT. A API revalida mesmo quando a emissão do evento está desativada.</p>
      <div className="flex flex-wrap gap-3">
        {([
          { action: 'price', label: 'Alterar preço' }, { action: 'stock', label: 'Esgotar edição' },
          { action: 'expire', label: 'Expirar sessão' }, { action: 'settle', label: 'Resolver pedidos pendentes' },
          { action: 'duplicate', label: 'Repetir evento do pedido' }, { action: 'stale', label: 'Emitir evento antigo' },
        ] as const).map(({ action, label }) => <Button variant="outline" key={action} disabled={mutation.isPending} onClick={() => mutation.mutate({ action })}>{label}</Button>)}
      </div>
    </section>
    {mutation.isError && <Failure error={mutation.error} />}
    {mutation.isSuccess && <p role="status" className="mt-4">Comando executado pela API simulada.</p>}
  </>
}
