import type { CatalogNft } from '@/shared/contracts/market'

export const catalog: CatalogNft[] = [
  { id: 'emerald-042', name: 'Emerald Ape #042', priceEth: '1.19', available: 5, version: 1, edition: 'standard', artwork: '/art/emerald.svg', description: 'Coleção Emerald · Edição padrão, limitada a 5 exemplares fictícios.' },
  { id: 'sage-009', name: 'Sage Nomad #009', priceEth: '1.69', available: 3, version: 1, edition: 'standard', artwork: '/art/sage.svg', description: 'Coleção Nomad · Edição padrão, limitada a 3 exemplares fictícios.' },
  { id: 'amber-012', name: 'Amber Echo #012', priceEth: '0.75', available: 10, version: 1, edition: 'standard', artwork: '/art/amber.svg', description: 'Coleção Echo · Edição padrão, limitada a 10 exemplares fictícios.' },
]

export const wallets = [
  { id: 'demo-main', name: 'Principal — aprova', address: 'demo.principal.eth', networks: ['ethereum', 'polygon'] as const, outcome: 'confirmed' as const },
  { id: 'demo-decline', name: 'Reserva — recusa', address: 'demo.reserva.eth', networks: ['polygon'] as const, outcome: 'declined' as const },
]
