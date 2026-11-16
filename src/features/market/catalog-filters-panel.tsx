import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

const compactQuery = '(max-width: 900px)'

export function CatalogFiltersPanel({ open, onOpenChange, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const resultsRef = useRef<HTMLButtonElement>(null)
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia(compactQuery)
    const change = () => { if (!media.matches) onOpenChange(false); notify() }
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [onOpenChange])
  const compact = useSyncExternalStore(subscribe, () => window.matchMedia(compactQuery).matches, () => false)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    // URL updates may replace the price form. Keep focus inside the modal.
    if (compact && open && dialog?.open && !dialog.contains(document.activeElement)) closeRef.current?.focus({ preventScroll: true })
  })

  useEffect(() => {
    const dialog = dialogRef.current
    if (!compact || !open || !dialog) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const { scrollX, scrollY } = window
    const style = document.body.style
    const previous = { position: style.position, top: style.top, left: style.left, right: style.right, width: style.width, overflow: style.overflow }
    // Fix the page in place as well as hiding overflow, including on touch browsers.
    Object.assign(style, { position: 'fixed', top: `-${scrollY}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' })
    dialog.showModal()
    closeRef.current?.focus({ preventScroll: true })
    return () => {
      if (dialog.open) dialog.close()
      Object.assign(style, previous)
      window.scrollTo(scrollX, scrollY)
      if (trigger?.isConnected && trigger.getClientRects().length) trigger.focus({ preventScroll: true })
    }
  }, [compact, open])

  if (!compact) return <aside id="catalog-filters" className="catalog-filters" aria-label="Filtros do catálogo">{children}</aside>
  return <dialog id="catalog-filters" ref={dialogRef} className="filter-drawer" aria-labelledby="filter-panel-title" onKeyDown={event => {
    if (event.key !== 'Tab') return
    if (event.shiftKey && document.activeElement === closeRef.current) {
      event.preventDefault()
      resultsRef.current?.focus({ preventScroll: true })
    } else if (!event.shiftKey && document.activeElement === resultsRef.current) {
      event.preventDefault()
      closeRef.current?.focus({ preventScroll: true })
    }
  }} onCancel={event => {
    event.preventDefault()
    onOpenChange(false)
  }} onClick={event => {
    if (event.target !== event.currentTarget) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onOpenChange(false)
  }}>
    <header className="filter-drawer-header"><h2 id="filter-panel-title">Filtros do catálogo</h2><Button ref={closeRef} variant="ghost" aria-label="Fechar filtros" onClick={() => onOpenChange(false)}><X aria-hidden="true" /></Button></header>
    <div className="catalog-filters filter-drawer-body">{children}</div>
    <footer className="filter-drawer-footer"><Button ref={resultsRef} onClick={() => onOpenChange(false)}>Ver resultados</Button></footer>
  </dialog>
}
