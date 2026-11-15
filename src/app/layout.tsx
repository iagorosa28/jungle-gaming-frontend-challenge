import { Link, Outlet } from '@tanstack/react-router'

export function Layout() {
  return <>
    <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:p-4 focus:text-primary-foreground">Pular para o conteúdo</a>
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-9">
        <Link to="/spike" search={{ scenario: 'success' }} className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" aria-label="Jungle Gaming, início do spike"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground" aria-hidden="true">J</span><span className="text-sm font-semibold tracking-tight">JUNGLE<span className="ml-1 text-muted-foreground">GAMING</span></span></Link>
        <span className="rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-widest text-primary sm:text-xs">Ambiente simulado</span>
      </div>
    </header>
    <Outlet />
    <footer className="border-t border-border"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-6 text-xs text-muted-foreground sm:px-9"><span>Jungle Gaming / Frontend Challenge</span><span>Dados fictícios · Sem transações reais</span></div></footer>
  </>
}
