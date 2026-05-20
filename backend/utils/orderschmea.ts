import { z } from 'zod'

export const orderSchema = z.object({
    type: z.enum(['limit', 'market']),
    side: z.enum(['buy', 'sell']),
    price: z.number().optional(),
    qty: z.number().positive(),
    asset: z.string()
})
