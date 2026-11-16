import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import type { CatalogNft, Quote, Session } from '@/shared/contracts/market'
import { formatEth } from '@/shared/lib/eth'
import { marketApi, marketKey, message, recoverConnection } from './api'

export function Loading() { return <div role="status" aria-label="Carregando dados" className="space-y-4 py-6"><Skeleton className="h-9 w-2/3" /><Skeleton className="h-48 w-full" /></div> }
export function Failure({ error, retry }: { error: unknown; retry?: () => unknown }) {
  const [retrying, setRetrying] = useState(false)
  const [recoveryError, setRecoveryError] = useState<unknown>()
  async function tryAgain() {
    if (!retry || retrying) return
    setRetrying(true)
    setRecoveryError(undefined)
    try { await recoverConnection(error); await retry() }
    catch (failure) { setRecoveryError(failure) }
    finally { setRetrying(false) }
  }
  return <div role="alert" className="panel space-y-3 text-destructive"><p>{message(recoveryError ?? error)}</p>{retry && <Button variant="outline" disabled={retrying} aria-busy={retrying} onClick={() => { void tryAgain() }}>{retrying ? 'Tentando novamente…' : 'Tentar novamente'}</Button>}</div>
}
export function Money({ value }: { value: string }) { return <>{formatEth(value)}</> }
export function QuoteSummary({ quote }: { quote: Quote }) {
  return <section className="panel space-y-4" aria-label="Resumo da cotação">
    <h2 className="text-xl font-semibold">Resumo da compra</h2>
    {quote.lines.map(line => <div key={line.nftId} className="flex flex-wrap justify-between gap-2"><span>{line.name} × {line.quantity}</span><span><Money value={line.lineTotalEth} /></span></div>)}
    <dl className="space-y-3 border-t border-border pt-4">{[['Subtotal', quote.subtotalEth], ['Desconto', quote.discountEth], ['Taxa de rede', quote.feeEth], ['Total', quote.totalEth]].map(([label, value]) => <div key={label} className={`flex justify-between gap-3 ${label === 'Total' ? 'font-bold text-primary text-xl' : 'text-muted-foreground'}`}><dt>{label}</dt><dd data-testid={label === 'Total' ? 'quote-total' : undefined}><Money value={value} /></dd></div>)}</dl>
    {quote.issues.map(issue => <p role="alert" key={issue} className="text-destructive">{issue}</p>)}
    <p className="text-xs text-muted-foreground">Cotação simulada · válida por 2 minutos · sem cupom nesta etapa.</p>
  </section>
}
export function AddToCart({ nft, session }: { nft: CatalogNft; session: Session }) {
  const client = useQueryClient()
  const mutation = useMutation({ mutationKey: [session.id, 'add-cart'], mutationFn: () => marketApi(session.id).editCart({ nftId: nft.id, edition: nft.edition, quantity: 1, mode: 'add' }), onSuccess: () => client.invalidateQueries({ queryKey: marketKey(session.id) }) })
  return <div className="space-y-3"><Button className="w-full" disabled={mutation.isPending || !nft.available} onClick={() => mutation.mutate()}>{nft.available ? 'Adicionar ao carrinho' : 'Esgotado'}</Button>{mutation.isSuccess && <p role="status" className="text-sm text-success">Adicionado. <Link to="/cart" className="underline">Ver carrinho</Link></p>}{mutation.isError && <Failure error={mutation.error} />}</div>
}
