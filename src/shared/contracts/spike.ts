import { z } from 'zod'

export const scenarioSchema = z.enum(['success', 'slow', 'error'])
export type Scenario = z.infer<typeof scenarioSchema>

export const ethSchema = z.string().regex(/^(0|[1-9]\d*)\.\d{1,18}$/)
export const nftSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priceEth: ethSchema,
  available: z.number().int().nonnegative(),
  version: z.number().int().positive(),
})
export const snapshotSchema = z.object({
  source: z.literal('MSW'),
  nft: nftSchema,
})
export type Snapshot = z.infer<typeof snapshotSchema>

const eventMetadata = {
  eventId: z.string().min(1),
  resourceId: z.string().min(1),
  version: z.number().int().positive(),
}
export const nftUpdatedSchema = z.object({
  ...eventMetadata,
  type: z.literal('nft.updated'),
  nft: nftSchema,
}).refine((event) => event.resourceId === event.nft.id && event.version === event.nft.version)
export const orderUpdatedSchema = z.object({
  ...eventMetadata,
  type: z.literal('order.updated'),
  status: z.enum(['pending', 'confirmed', 'declined']),
})
export type NftUpdated = z.infer<typeof nftUpdatedSchema>
export type OrderUpdated = z.infer<typeof orderUpdatedSchema>
export type RealtimeEvent = NftUpdated | OrderUpdated

export interface ServerEvents {
  'nft.updated': (event: NftUpdated) => void
  'order.updated': (event: OrderUpdated) => void
}

// Only the mock control endpoint accepts these deterministic delivery variants.
export const emitInputSchema = z.object({
  delivery: z.enum(['next', 'duplicate', 'stale']).default('next'),
})
export const emitResultSchema = z.object({ eventId: z.string(), version: z.number().int() })
