import { z } from 'zod'

export const updateMyProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl:   z.string().url().optional().or(z.literal('')),
  preferences: z.record(z.unknown()).optional(),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'contributor', 'viewer']),
})

export const generateInviteSchema = z.object({
  role:      z.enum(['editor', 'contributor', 'viewer']),
  expiresIn: z.enum(['24h', '7d', 'never']).default('7d'),
  label:     z.string().max(100).optional(),
})

export const listUsersSchema = z.object({
  role:    z.enum(['owner', 'admin', 'editor', 'contributor', 'viewer']).optional(),
  keyword: z.string().optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
})

export type UpdateMyProfileInput  = z.infer<typeof updateMyProfileSchema>
export type UpdateUserRoleInput   = z.infer<typeof updateUserRoleSchema>
export type GenerateInviteInput   = z.infer<typeof generateInviteSchema>
export type ListUsersInput        = z.infer<typeof listUsersSchema>
