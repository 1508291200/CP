import { z } from 'zod'

export const createCpSchema = z.object({
  name:         z.string().min(1).max(200),
  subtitle:     z.string().max(200).optional(),
  description:  z.string().optional(),
  status:       z.enum(['active', 'archived', 'completed']).default('active'),
  visibility:   z.enum(['public', 'members', 'private']).default('private'),
  sortOrder:    z.number().int().default(0),
  tagIds:       z.array(z.string()).optional(),
})

export const updateCpSchema = createCpSchema.partial()

export const cpQuerySchema = z.object({
  q:      z.string().optional(),
  status: z.enum(['active', 'archived', 'completed']).optional(),
  tagId:  z.string().optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateCpInput = z.infer<typeof createCpSchema>
export type UpdateCpInput = z.infer<typeof updateCpSchema>
export type CpQuery       = z.infer<typeof cpQuerySchema>
