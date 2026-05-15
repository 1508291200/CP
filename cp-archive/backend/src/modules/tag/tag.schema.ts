import { z } from 'zod'

export const createTagSchema = z.object({
  name:     z.string().min(1).max(100),
  color:    z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#7B5EA7'),
  category: z.string().max(50).optional(),
})

export const updateTagSchema = createTagSchema.partial()

export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
