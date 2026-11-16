import { Outlet } from '@tanstack/react-router'

export function Layout() {
  return <>
    <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:p-4 focus:text-primary-foreground">Pular para o conteúdo</a>
    <Outlet />
    <footer className="border-t border-border"><div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-6 text-xs text-muted-foreground sm:px-9"><span>Kurio · Marketplace fictício</span><span>Dados fictícios · Sem transações reais</span></div></footer>
  </>
}
