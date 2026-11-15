import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { marketApi, marketKey } from './api'
import { useSession } from './session'
import { AddToCart, Failure, Loading, Money } from './components'

export function CatalogPage() {
  const session = useSession().data!
  const query = useQuery({ queryKey: [...marketKey(session.id), 'catalog'], queryFn: ({ signal }) => marketApi(session.id).catalog(signal) })
  return <><section className="hero mb-10"><p className="text-primary">Bem-vindo à Jungle</p><h1 className="mt-4 max-w-2xl text-3xl font-bold leading-snug sm:text-5xl">Seja dono da<br />cultura digital.</h1><p className="mt-5 max-w-xl text-muted-foreground">Explore uma seleção de NFTs e experimente sua primeira coleção. Compra, carteira e pagamento inteiramente fictícios.</p><a href="#colecao" className="mt-6 inline-block font-bold text-primary underline underline-offset-8">EXPLORAR →</a></section>
    <section id="colecao"><h2 className="mb-6 text-2xl font-semibold">Todos os NFTs</h2>
      {query.isPending ? <Loading /> : query.isError ? <Failure error={query.error} retry={query.refetch} /> : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{query.data.map(nft => <article className="panel space-y-4" key={nft.id}><Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block"><img src={nft.artwork} alt={`Arte geométrica de ${nft.name}`} className="aspect-square w-full rounded-2xl" width="400" height="400" /><h3 className="mt-5 text-lg font-semibold underline-offset-4 hover:underline">{nft.name}</h3></Link><p className="text-xl font-bold text-primary"><Money value={nft.priceEth} /></p><p className="text-sm text-muted-foreground">Edição padrão · {nft.available} disponíveis</p><AddToCart nft={nft} session={session} /></article>)}</div>}
    </section></>
}
export function NftPage({ id }: { id: string }) {
  const session = useSession().data!
  const query = useQuery({ queryKey: [...marketKey(session.id), 'nft', id], queryFn: ({ signal }) => marketApi(session.id).nft(id, signal) })
  if (query.isPending) return <Loading />
  if (query.isError) return <Failure error={query.error} retry={query.refetch} />
  const nft = query.data
  return <div className="grid items-center gap-8 md:grid-cols-2"><img className="w-full rounded-3xl" src={nft.artwork} alt={`Arte geométrica de ${nft.name}`} width="400" height="400" /><section className="space-y-6"><h1 className="text-3xl font-bold">{nft.name}</h1><p className="text-muted-foreground">{nft.description}</p><p className="text-2xl text-primary"><Money value={nft.priceEth} /></p><p>{nft.available} disponíveis · Edição padrão</p><AddToCart nft={nft} session={session} /><Link to="/cart" className="nav-link inline-block">Revisar carrinho →</Link></section></div>
}
