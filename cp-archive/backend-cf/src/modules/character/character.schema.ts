import { z } from 'zod'

export const createCharacterSchema = z.object({
  name:         z.string().min(1).max(100),
  aliases:      z.array(z.string()).default([]),
  avatarUrl:    z.string().url().optional(),
  roleLabel:    z.string().max(50).optional(),
  birthday:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  bio:          z.string().optional(),
  customFields: z.array(z.unknown()).default([]),
  sortOrder:    z.number().int().default(0),
})

export const updateCharacterSchema = createCharacterSchema.partial()

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>
