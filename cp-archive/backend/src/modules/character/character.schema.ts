import { z } from 'zod'

export const createCharacterSchema = z.object({
  name:         z.string().min(1).max(100),
  aliases:      z.array(z.string()).optional().default([]),
  avatarUrl:    z.string().url().optional().or(z.literal('')),
  roleLabel:    z.string().max(50).optional(),
  birthday:     z.string().date().optional().nullable(),
  bio:          z.string().optional(),
  customFields: z.array(z.record(z.unknown())).optional().default([]),
  sortOrder:    z.number().int().optional().default(0),
})

export const updateCharacterSchema = createCharacterSchema.partial()

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>
