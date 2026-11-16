import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/components/ui/button'
import { demoKey, marketApi, marketKey } from './api'
import { useSession } from './session'
import { Failure } from './components'

export function CatalogFailure({ error, retry }: { error: unknown; retry: () => unknown }) {
  const session = useSession().data!
  const client = useQueryClient()
  const api = marketApi(session.id)
  const conditions = useQuery({ queryKey: demoKey, queryFn: ({ signal }) => api.demoState(signal) })
  const recovery = useMutation({
    mutationFn: () => api.demo({ action: 'network', catalog: 'normal', loginDelayMs: 0 }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: demoKey })
      await client.invalidateQueries({ queryKey: marketKey(session.id) })
    },
  })
  const forced = ['http-error', 'network-error'].includes(conditions.data?.networkConditions.catalog ?? '')
  return <div className="space-y-4">
    <Failure error={error} retry={retry} />
    {forced && <div className="panel space-y-4 text-sm">
      <p>Uma falha de rede está forçada nos Cenários. Tentar novamente repete a requisição e continuará falhando enquanto essa condição estiver ativa.</p>
      <Button variant="outline" disabled={recovery.isPending} onClick={() => recovery.mutate()}>Restaurar rede normal</Button>
      <Link to="/demo" className="nav-link ml-4 inline-block">Abrir Cenários</Link>
    </div>}
    {recovery.isError && <Failure error={recovery.error} />}
    {conditions.isError && <Link to="/demo" className="nav-link inline-block">Ver condições em Cenários</Link>}
  </div>
}
