import { useNavigate, useSearch } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { catalogSearchFromUrl } from '@/shared/contracts/market'

export function CatalogSearchForm({ id, className = '', placeholder = 'Explorar coleções' }: { id: string; className?: string; placeholder?: string }) {
  const params = useSearch({ strict: false })
  const search = catalogSearchFromUrl(params)
  const navigate = useNavigate()
  return <form key={search.q} role="search" className={`catalog-search ${className}`} onSubmit={event => {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    void navigate({ to: '/', search: { ...search, q, page: 1 }, resetScroll: false })
  }}>
    <label className="sr-only" htmlFor={id}>Buscar NFTs</label>
    <input id={id} name="q" maxLength={100} defaultValue={search.q} placeholder={placeholder} type="search" />
    <button type="submit" aria-label="Buscar"><Search aria-hidden="true" size={23} /></button>
  </form>
}
