import { z } from 'zod'

export const createMilestoneSchema = z.object({
  title:         z.string().min(1).max(500),
  description:   z.string().optional(),
  milestoneDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  icon:          z.string().max(50).default('⭐'),
  eventId:       z.string().optional(),
  sortOrder:     z.number().int().default(0),
})

export const updateMilestoneSchema = createMilestoneSchema.partial()

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>
