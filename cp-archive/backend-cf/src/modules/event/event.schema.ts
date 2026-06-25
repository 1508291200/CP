import { z } from 'zod'

export const createEventSchema = z.object({
  title:         z.string().min(1).max(500),
  summary:       z.string().optional(),
  content:       z.record(z.unknown()).optional().default({}),
  eventDate:     z.string().date().nullable().optional(),
  datePrecision: z.enum(['year', 'month', 'day']).optional().default('day'),
  importance:    z.enum(['critical', 'high', 'medium', 'normal', 'low']).optional().default('normal'),
  visibility:    z.enum(['public', 'members', 'specified', 'private']).optional().default('members'),
  isMilestone:   z.boolean().optional().default(false),
  sourceRef:     z.string().max(500).optional(),
  emotionIcon:   z.string().max(50).optional(),
  customFields:  z.record(z.unknown()).optional().default({}),
  tagIds:        z.array(z.string()).optional().default([]),
})

export const updateEventSchema = createEventSchema.partial()

export const eventQuerySchema = z.object({
  importance:  z.enum(['critical', 'high', 'medium', 'normal', 'low']).optional(),
  dateStart:   z.string().date().optional(),
  dateEnd:     z.string().date().optional(),
  tagId:       z.string().optional(),
  keyword:     z.string().optional(),
  isMilestone: z.coerce.boolean().optional(),
  order:       z.enum(['asc', 'desc']).optional().default('desc'),
  page:        z.coerce.number().int().min(1).optional().default(1),
  limit:       z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventQuery       = z.infer<typeof eventQuerySchema>
