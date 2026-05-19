import { z } from 'zod'

export const updateMyProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl:   z.string().url().optional().or(z.literal('')),
  preferences: z.record(z.unknown()).optional(),
})

// 可被设置的全站角色（不含 owner：唯一且不可转让）
export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'cp_admin', 'editor', 'viewer']),
})

// 全站邀请码（owner/admin 生成）
export const generateInviteSchema = z.object({
  role:      z.enum(['admin', 'cp_admin', 'editor', 'viewer']),
  expiresIn: z.enum(['24h', '7d', 'never']).default('7d'),
  label:     z.string().max(100).optional(),
  maxUses:   z.number().int().min(1).max(100).default(1),
})

// CP 内邀请码（cp_admin 生成，角色固定为 editor）
export const generateCpInviteSchema = z.object({
  cpId:      z.string().uuid(),
  expiresIn: z.enum(['24h', '7d', 'never']).default('7d'),
  label:     z.string().max(100).optional(),
})

// 配额调整（owner/admin 操作）
export const updateCpAdminQuotaSchema = z.object({
  userId:      z.string().uuid(),
  cpId:        z.string().uuid(),
  inviteQuota: z.number().int().min(0).max(1000),
})

export const listUsersSchema = z.object({
  role:    z.enum(['owner', 'admin', 'cp_admin', 'editor', 'viewer']).optional(),
  keyword: z.string().optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
})

export type UpdateMyProfileInput    = z.infer<typeof updateMyProfileSchema>
export type UpdateUserRoleInput     = z.infer<typeof updateUserRoleSchema>
export type GenerateInviteInput     = z.infer<typeof generateInviteSchema>
export type GenerateCpInviteInput   = z.infer<typeof generateCpInviteSchema>
export type UpdateCpAdminQuotaInput = z.infer<typeof updateCpAdminQuotaSchema>
export type ListUsersInput          = z.infer<typeof listUsersSchema>
