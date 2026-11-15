import type { Snapshot } from '@/shared/contracts/spike'

export function createSnapshot(): Snapshot {
  return {
    source: 'MSW',
    nft: { id: 'emerald-042', name: 'Emerald Ape #042', priceEth: '1.19', available: 8, version: 1 },
  }
}
