import { z } from 'zod'
import { ethSchema, nftSchema } from './spike'

export const quantitySchema = z.number().int().min(1).max(10)
export const itemSchema = z.object({ nftId: z.string().min(1), edition: z.literal('standard'), quantity: quantitySchema })
export const catalogNftSchema = nftSchema.extend({ edition: z.literal('standard'), description: z.string(), artwork: z.string() })
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
export const demoInputSchema = z.discriminatedUnion('action', [
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
