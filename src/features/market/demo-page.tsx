import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/shared/components/ui/button'
import { scenarioSchema, networkConditionsSchema, type DemoInput } from '@/shared/contracts/market'
import { marketApi, sessionKey } from './api'
import { useSession } from './session'
import { Failure } from './components'

export function DemoPage() {
  const session = useSession().data!
  const client = useQueryClient()
  const router = useRouter()
  const mutation = useMutation({ mutationKey: [session.id, 'demo'], mutationFn: (input: DemoInput) => marketApi(session.id).demo(input), onSuccess: async (_, input) => {
    if (input.action === 'reset') {
      // Remove only this application's authorized attempts, preserving unrelated storage.
      for (const key of Object.keys(sessionStorage)) if (key.startsWith('jungle.attempt.')) sessionStorage.removeItem(key)
      await client.cancelQueries({ queryKey: ['market'] }); client.removeQueries({ queryKey: ['market'] })
      await client.invalidateQueries({ queryKey: sessionKey })
      await router.navigate({ to: '/' })
    } else if (input.action === 'network') await client.invalidateQueries({ queryKey: ['market'] })
    else if (input.action === 'expire') await client.invalidateQueries({ queryKey: sessionKey })
  } })
  return <><h1 className="page-title">Cenários da demonstração</h1><p className="mb-6 text-muted-foreground">Controles da API fictícia. Restaurar um cenário apaga contas cadastradas, carrinhos, pedidos e sessões desta demonstração.</p><form className="panel space-y-5" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate({ action: 'reset', scenario: scenarioSchema.parse(form.get('scenario')) }) }}><label className="form-label">Cenário<select name="scenario" className="field">{scenarioSchema.options.map(s => <option key={s}>{s}</option>)}</select></label><Button disabled={mutation.isPending}>Restaurar cenário</Button></form><form className="panel mt-6 space-y-5" onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); mutation.mutate({ action: 'network', ...networkConditionsSchema.parse({ catalog: values.get('catalog'), loginDelayMs: Number(values.get('loginDelayMs')) }) }) }}><h2>Condições de rede</h2><label className="form-label">Rede do catálogo<select name="catalog" className="field">{networkConditionsSchema.shape.catalog.unwrap().options.map(mode => <option key={mode}>{mode}</option>)}</select></label><label className="form-label">Latência do login (ms)<input type="number" min="0" max="3000" defaultValue="0" name="loginDelayMs" className="field" /></label><Button disabled={mutation.isPending}>Aplicar condições</Button><p className="text-sm text-muted-foreground">Condições persistem após refresh. Restaurar cenário retorna à rede normal.</p></form><section className="panel mt-6 space-y-4"><h2>Alterações durante a compra</h2><p className="text-sm text-muted-foreground">Preço e estoque alteram o primeiro NFT. A API revalida mesmo quando a emissão do evento está desativada.</p><div className="flex flex-wrap gap-3">{[{ action: 'price', label: 'Alterar preço' }, { action: 'stock', label: 'Esgotar edição' }, { action: 'expire', label: 'Expirar sessão' }, { action: 'settle', label: 'Resolver pedidos pendentes' }, { action: 'duplicate', label: 'Repetir evento do pedido' }, { action: 'stale', label: 'Emitir evento antigo' }].map(({ action, label }) => <Button variant="outline" key={action} disabled={mutation.isPending} onClick={() => mutation.mutate({ action: action as 'price' | 'stock' | 'expire' | 'settle' | 'duplicate' | 'stale' })}>{label}</Button>)}</div></section>{mutation.isError && <Failure error={mutation.error} />}{mutation.isSuccess && <p role="status" className="mt-4">Comando executado pela API simulada.</p>}</>
}
