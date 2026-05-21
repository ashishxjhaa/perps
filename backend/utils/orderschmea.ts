import { z } from 'zod'

export const orderSchema = z.object({
    type: z.enum(['limit', 'market']),
    side: z.enum(['long', 'short']),
    price: z.number().optional(),
    qty: z.number().positive(),
    asset: z.string()
})
