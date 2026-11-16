import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Search, SlidersHorizontal, ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { categories, type CatalogSearch } from '@/shared/contracts/market'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { marketApi, marketKey } from './api'
import { useSession } from './session'
import { CatalogSearchForm } from './catalog-search'
import { CatalogPriceFilter } from './catalog-price-filter'
import { CatalogFailure } from './catalog-failure'
import { AddToCart, Failure, Loading, Money } from './components'

export function CatalogPage({ search }: { search: CatalogSearch }) {
  const session = useSession().data!
  const navigate = useNavigate({ from: '/' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const query = useQuery({ queryKey: [...marketKey(session.id), 'catalog', search], queryFn: ({ signal }) => marketApi(session.id).catalog(search, signal) })
  function update(change: Partial<CatalogSearch>) { void navigate({ search: { ...search, ...change, page: change.page ?? 1 }, resetScroll: false }) }
  useEffect(() => {
    if (query.data && query.data.page !== search.page) void navigate({ search: { ...search, page: query.data.page }, replace: true, resetScroll: false })
  }, [query.data, search, navigate])
  const selected = [search.q && `Busca: ${search.q}`, search.category && categories[search.category], search.network, search.min !== undefined && `A partir de ${search.min} ETH`, search.max !== undefined && `Até ${search.max} ETH`].filter(Boolean)
  return <>
    <div className="catalog-search-row">
      <CatalogSearchForm id="catalog-search" />
      <Button className="filter-toggle" variant="outline" aria-label="Filtros" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal aria-hidden="true" size={20} /><span>Filtros</span></Button>
    </div>
    <section className="catalog-hero" aria-labelledby="hero-title">
      <div className="hero-copy"><p className="hero-eyebrow">Bem-vindo à Kurio</p><h1 id="hero-title"><span className="hero-desktop-title">Seja dono do futuro<br />da arte digital</span><span className="hero-mobile-title">Seja dono da<br />cultura digital</span></h1><p className="hero-description"><span className="hero-desktop-description">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara e tenha uma parte da cultura da internet.</span><span className="hero-mobile-description">Descubra NFTs selecionados de criadores do mundo todo.</span></p><a href="#colecao" className="hero-explore">Explorar <ArrowRight aria-hidden="true" size={20} /></a></div>
      <Link to="/nfts/$nftId" params={{ nftId: 'emerald-042' }} className="hero-art" aria-label="Conhecer Emerald Ape #042"><img src="/art/nfts/emerald-ape.png" alt="Emerald Ape, macaco com óculos e jaqueta verde" width="900" height="900" fetchPriority="high" /><img className="hero-companion" src="/art/nfts/sage-nomad.png" alt="" width="500" height="500" /></Link>
    </section>
    <section id="colecao" className="catalog-section" aria-label="Catálogo de NFTs">
      <aside id="catalog-filters" className="catalog-filters" data-open={filtersOpen} aria-label="Filtros do catálogo">
        <h2>Coleções</h2>
        <p id="facet-scope" className="facet-caption">Contagens do catálogo completo</p><fieldset aria-describedby="facet-scope"><legend className="sr-only">Categoria</legend><label className="filter-choice"><input type="radio" name="category" aria-label="Todas as categorias" checked={!search.category} onChange={() => update({ category: undefined })} /><span>Todas as categorias</span><span className="facet-count" aria-hidden="true">({query.data?.facets.total ?? "–"})</span></label>{Object.entries(categories).map(([value, label]) => <label className="filter-choice" key={value}><input type="radio" name="category" aria-label={label} aria-description={`${query.data?.facets.categories[value as keyof typeof categories] ?? "–"} NFTs no catálogo completo`} value={value} checked={search.category === value} onChange={() => update({ category: value as CatalogSearch['category'] })} /><span>{label}</span><span className="facet-count" aria-hidden="true">({query.data?.facets.categories[value as keyof typeof categories] ?? "–"})</span></label>)}</fieldset>
        <CatalogPriceFilter key={`${search.min}-${search.max}`} search={search} range={query.data?.facets.priceRange} update={update} />
        <fieldset aria-describedby="facet-scope"><legend>Rede</legend>{[['', 'Todas as redes'], ['ethereum', 'Ethereum'], ['polygon', 'Polygon']].map(([value, label]) => <label className="filter-choice" key={value}><input type="radio" name="network" aria-label={label} aria-description={`${value ? query.data?.facets.networks[value as "ethereum" | "polygon"] ?? "–" : query.data?.facets.total ?? "–"} NFTs no catálogo completo`} checked={(search.network ?? '') === value} onChange={() => update({ network: (value || undefined) as CatalogSearch['network'] })} /><span>{label}</span><span className="facet-count" aria-hidden="true">({value ? query.data?.facets.networks[value as "ethereum" | "polygon"] ?? "–" : query.data?.facets.total ?? "–"})</span></label>)}</fieldset>
        <Link to="/nfts/$nftId" params={{ nftId: 'sage-009' }} className="sidebar-feature"><span>NFT em destaque</span><img src="/art/nfts/sage-nomad.png" width="500" height="500" alt="Sage Nomad, macaco com chapéu verde e moletom roxo" loading="lazy" /><span>Conheça Sage Nomad →</span></Link>
      </aside>
      <div className="catalog-results">
        <div className="catalog-toolbar"><h2>Todos os NFTs</h2><label>Ordenar por<select className="field" aria-label="Ordenar NFTs" value={search.sort} onChange={event => update({ sort: event.target.value as CatalogSearch['sort'] })}><option value="recent">Listados recentemente</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option></select></label></div>
        <div className="catalog-feedback"><p role="status" aria-live="polite">{query.isPending ? 'Buscando NFTs…' : query.isError ? 'Não foi possível carregar os resultados.' : `${query.data.total} NFTs encontrados`}{query.isFetching && !query.isPending && ' · Atualizando resultados…'}</p>{(selected.length > 0 || search.sort !== 'recent') && <Button variant="ghost" onClick={() => { void navigate({ search: { q: '', sort: 'recent', page: 1 }, resetScroll: false }) }}><X aria-hidden="true" size={14} />Limpar filtros</Button>}</div>
        {selected.length > 0 && <ul className="selected-filters" aria-label="Filtros selecionados">{selected.map(value => <li key={String(value)}>✓ {value}</li>)}</ul>}
        <div aria-busy={query.isFetching} className="catalog-content">
          {query.isPending ? <div className="nft-grid" role="status" aria-label="Carregando catálogo">{Array.from({ length: 9 }, (_, i) => <div className="nft-card" key={i}><Skeleton className="nft-art" /><Skeleton className="mt-4 h-4 w-4/5" /><Skeleton className="mt-3 h-5 w-1/2" /><Skeleton className="mt-4 h-10 w-full" /></div>)}</div> : query.isError ? <CatalogFailure error={query.error} retry={query.refetch} /> : query.data.items.length === 0 ? <div className="catalog-empty"><Search aria-hidden="true" size={32} /><h3>Nenhum NFT encontrado</h3><p>Tente outra busca ou limpe os filtros para explorar a coleção.</p></div> : <div className="nft-grid" data-testid="nft-grid">{query.data.items.map(nft => <article className="nft-card" key={nft.id}><Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="nft-link"><div className="nft-art"><img src={nft.artwork} alt={`Arte de ${nft.name}`} width="500" height="500" loading="lazy" /></div><h3>{nft.name}</h3></Link><p className="nft-price"><Money value={nft.priceEth} /></p><p className="nft-meta">{nft.network} · {nft.available} disponíveis</p><AddToCart nft={nft} session={session} /></article>)}</div>}
        </div>
        {query.isSuccess && query.data.pages > 0 && <nav className="catalog-pagination" aria-label="Paginação do catálogo"><button aria-label="Página anterior" disabled={query.data.page === 1} onClick={() => update({ page: query.data.page - 1 })}><ChevronLeft size={18} aria-hidden="true" /></button>{Array.from({ length: query.data.pages }, (_, i) => i + 1).map(page => <button key={page} aria-label={`Página ${page}`} aria-current={query.data.page === page ? 'page' : undefined} onClick={() => update({ page })}>{page}</button>)}<button aria-label="Próxima página" disabled={query.data.page === query.data.pages} onClick={() => update({ page: query.data.page + 1 })}><ChevronRight size={18} aria-hidden="true" /></button></nav>}
      </div>
    </section>
    <p className="catalog-disclaimer">Coleção demonstrativa · 21 NFTs fictícios utilizam quatro artes de referência. Nenhuma transação é real.</p>
  </>
}
export function NftPage({ id }: { id: string }) {
  const session = useSession().data!
  const query = useQuery({ queryKey: [...marketKey(session.id), 'nft', id], queryFn: ({ signal }) => marketApi(session.id).nft(id, signal) })
  if (query.isPending) return <Loading />
  if (query.isError) return <Failure error={query.error} retry={query.refetch} />
  const nft = query.data
  return <div className="grid items-center gap-8 md:grid-cols-2"><img className="w-full rounded-3xl" src={nft.artwork} alt={`Arte de ${nft.name}`} width="400" height="400" /><section className="space-y-6"><h1 className="text-3xl font-bold">{nft.name}</h1><p className="text-muted-foreground">{nft.description}</p><p className="text-2xl text-primary"><Money value={nft.priceEth} /></p><p>{nft.available} disponíveis · Edição padrão</p><AddToCart nft={nft} session={session} /><Link to="/cart" className="nav-link inline-block">Revisar carrinho →</Link></section></div>
}
