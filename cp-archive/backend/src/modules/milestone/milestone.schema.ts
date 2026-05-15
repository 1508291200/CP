import { z } from 'zod'

export const createMilestoneSchema = z.object({
  title:         z.string().min(1).max(500),
  description:   z.string().optional(),
  milestoneDate: z.string().date().optional().nullable(),
  icon:          z.string().max(50).optional().default('⭐'),
  eventId:       z.string().uuid().optional().nullable(),
  sortOrder:     z.number().int().optional().default(0),
})

export const updateMilestoneSchema = createMilestoneSchema.partial()

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>
