import { useState, type CSSProperties } from 'react'
import Decimal from 'decimal.js'
import { catalogSearchSchema, type CatalogSearch, type CatalogFacets } from '@/shared/contracts/market'
import { Button } from '@/shared/components/ui/button'

export function CatalogPriceFilter({ search, range, update }: {
  search: CatalogSearch
  range?: CatalogFacets['priceRange']
  update: (input: Partial<CatalogSearch>) => void
}) {
  const [min, setMin] = useState(search.min ?? '')
  const [max, setMax] = useState(search.max ?? '')
  const [validation, setValidation] = useState('')
  function amount(value: string, fallback: string) {
    const result = catalogSearchSchema.shape.min.safeParse(value)
    return new Decimal(result.success && result.data ? result.data : fallback)
  }
  // Slider coordinates are approximate; numeric inputs keep their exact decimal strings.
  const ceiling = Decimal.max(amount(min, '0'), amount(max, '0'), range?.max ?? '1').ceil().toNumber() || 1
  const lower = amount(min, '0').toNumber()
  const upper = amount(max, String(ceiling)).toNumber()
  const sliderStyle = { '--range-start': `${Math.min(lower / ceiling * 100, 100)}%`, '--range-end': `${100 - Math.min(upper / ceiling * 100, 100)}%` } as CSSProperties
  return <form className="price-filter" onSubmit={event => {
    event.preventDefault()
    const input = { min: min || undefined, max: max || undefined }
    if (!catalogSearchSchema.safeParse({ ...search, ...input }).success) {
      setValidation('Informe preços positivos, com ponto decimal, e mínimo menor ou igual ao máximo.')
      return
    }
    setValidation('')
    update(input)
  }}>
    <h2>Faixa de preço</h2>
    <div className="price-slider" style={sliderStyle}>
      <div className="price-slider-track" /><div className="price-slider-selection" />
      <input type="range" aria-label="Preço mínimo no slider" aria-valuetext={`${min || '0'} ETH`} min="0" max={ceiling} step="0.01" value={lower} onChange={event => setMin(Decimal.min(event.target.value, upper).toString())} />
      <input type="range" aria-label="Preço máximo no slider" aria-valuetext={`${max || ceiling} ETH`} min="0" max={ceiling} step="0.01" value={upper} onChange={event => setMax(Decimal.max(event.target.value, lower).toString())} />
    </div>
    <p className="price-range-caption">Preço: {min || '0'} – {max || 'sem limite'} ETH</p>
    <div className="price-fields">
      <label className="form-label">Mínimo (ETH)<input className="field" name="min" inputMode="decimal" value={min} onChange={event => setMin(event.target.value)} placeholder="0.00" aria-describedby="price-validation" /></label>
      <label className="form-label">Máximo (ETH)<input className="field" name="max" inputMode="decimal" value={max} onChange={event => setMax(event.target.value)} placeholder="Sem limite" aria-describedby="price-validation" /></label>
    </div>
    <p id="price-validation" role={validation ? 'alert' : undefined} className="text-sm text-destructive">{validation}</p>
    <Button type="submit">Aplicar preço</Button>
  </form>
}
