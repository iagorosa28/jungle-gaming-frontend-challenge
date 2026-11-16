import { z } from 'zod'
import Decimal from 'decimal.js'
import { ethSchema, nftSchema } from './spike'

export const quantitySchema = z.number().int().min(1).max(10)
export const itemSchema = z.object({ nftId: z.string().min(1), edition: z.literal('standard'), quantity: quantitySchema })
export const categories = { digital: 'Arte digital', photography: 'Fotografia', music: 'Música', '3d': 'Arte 3D', collectibles: 'Colecionáveis', generative: 'Generativa', games: 'Jogos' } as const
export const categorySchema = z.enum(['digital', 'photography', 'music', '3d', 'collectibles', 'generative', 'games'])
export const networkSchema = z.enum(['ethereum', 'polygon'])
export const catalogNftSchema = nftSchema.extend({
  edition: z.literal('standard'), description: z.string(), artwork: z.string(),
  category: categorySchema.default('digital'), network: networkSchema.default('ethereum'), listedAt: z.number().int().default(0),
})
const priceFilter = z.string().regex(/^(0|[1-9]\d{0,5})(\.\d{1,18})?$/)
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(100).default(''), category: categorySchema.optional(), network: networkSchema.optional(),
  min: priceFilter.optional(), max: priceFilter.optional(),
  sort: z.enum(['recent', 'price-asc', 'price-desc']).default('recent'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
}).refine(s => s.min === undefined || s.max === undefined || !priceFilter.safeParse(s.min).success || !priceFilter.safeParse(s.max).success || new Decimal(s.min).lte(s.max), { message: 'O preço mínimo deve ser menor ou igual ao máximo.' })
export type CatalogSearch = z.infer<typeof catalogSearchSchema>
// Invalid URL values fall back independently; REST uses the strict schema above.
export function catalogSearchFromUrl(raw: Record<string, unknown>): CatalogSearch {
  const shape = catalogSearchSchema.shape
  const values = { q: shape.q.catch('').parse(raw.q), sort: shape.sort.catch('recent').parse(raw.sort), page: shape.page.catch(1).parse(raw.page), category: shape.category.catch(undefined).parse(raw.category), network: shape.network.catch(undefined).parse(raw.network), min: shape.min.catch(undefined).parse(raw.min), max: shape.max.catch(undefined).parse(raw.max) }
  const result = catalogSearchSchema.safeParse(values)
  if (result.success) return result.data
  return catalogSearchSchema.parse({ ...values, min: undefined, max: undefined })
}
const countSchema = z.number().int().nonnegative()
export const catalogFacetsSchema = z.object({
  total: countSchema,
  categories: z.record(categorySchema, countSchema),
  networks: z.record(networkSchema, countSchema),
  priceRange: z.object({ min: ethSchema, max: ethSchema }),
})
export type CatalogFacets = z.infer<typeof catalogFacetsSchema>
export const catalogResponseSchema = z.object({ items: z.array(catalogNftSchema), total: countSchema, page: z.number().int().positive(), pageSize: z.literal(9), pages: countSchema, facets: catalogFacetsSchema })
export type CatalogResponse = z.infer<typeof catalogResponseSchema>
export const networkConditionsSchema = z.object({ catalog: z.enum(['normal', 'slow', 'http-error', 'network-error', 'out-of-order']).default('normal'), loginDelayMs: z.number().int().min(0).max(3000).default(0) })
export const cartSchema = z.object({ items: z.array(itemSchema), revision: z.number().int().nonnegative() })
export const userSchema = z.object({ id: z.string(), name: z.string(), email: z.email() })
export const sessionSchema = z.object({ id: z.string(), user: userSchema.nullable(), expiresAt: z.number().nullable() })
export const loginSchema = z.object({ email: z.email().transform(s => s.toLowerCase()), password: z.string().min(8).max(128) })
export const registerSchema = loginSchema.extend({ name: z.string().trim().min(2).max(80) })
export const quoteLineSchema = itemSchema.extend({ name: z.string(), priceEth: ethSchema, lineTotalEth: ethSchema, version: z.number().int() })
export const quoteSchema = z.object({
  id: z.string(), revision: z.number().int(), lines: z.array(quoteLineSchema),
  subtotalEth: ethSchema, discountEth: ethSchema, feeEth: ethSchema, totalEth: ethSchema,
  valid: z.boolean(), issues: z.array(z.string()), expiresAt: z.number(),
})
export const walletSchema = z.object({ id: z.string(), name: z.string(), address: z.string(), networks: z.array(z.enum(['ethereum', 'polygon'])), outcome: z.enum(['confirmed', 'declined']) })
export const orderInputSchema = z.object({ quoteId: z.string(), walletId: z.string(), network: z.enum(['ethereum', 'polygon']), buyer: z.object({ name: z.string().trim().min(2).max(80), email: z.email() }) })
export const orderSchema = z.object({
  id: z.string(), userId: z.string(), key: z.string(), input: orderInputSchema,
  status: z.enum(['pending', 'confirmed', 'declined']), version: z.number().int().positive(),
  quote: quoteSchema, createdAt: z.number(), resolveAt: z.number(), outcome: z.enum(['confirmed', 'declined']),
  transaction: z.string().nullable(),
})
export const attemptSchema = z.object({ key: z.string().uuid(), input: orderInputSchema })
export const scenarioSchema = z.enum(['success', 'declined', 'timeout', 'pending', 'price-change', 'sold-out'])
export const demoStateSchema = z.object({ scenario: scenarioSchema, networkConditions: networkConditionsSchema })
export const demoInputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('network'), ...networkConditionsSchema.shape }),
  z.object({ action: z.literal('reset'), scenario: scenarioSchema }),
  z.object({ action: z.enum(['price', 'stock', 'expire', 'settle', 'duplicate', 'stale']), broadcast: z.boolean().default(true) }),
])
export type CatalogNft = z.infer<typeof catalogNftSchema>
export type Cart = z.infer<typeof cartSchema>
export type Session = z.infer<typeof sessionSchema>
export type Quote = z.infer<typeof quoteSchema>
export type Order = z.infer<typeof orderSchema>
export type OrderInput = z.infer<typeof orderInputSchema>
export type Attempt = z.infer<typeof attemptSchema>
export type DemoInput = z.input<typeof demoInputSchema>
