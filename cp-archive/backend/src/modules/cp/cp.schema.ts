/**
 * CP 模块 - Zod 验证 Schema
 */

import { z } from 'zod'

export const createCpSchema = z.object({
  name:        z.string().min(1).max(200),
  subtitle:    z.string().max(200).optional(),
  description: z.string().optional(),
  coverUrl:    z.string().url().optional().or(z.literal('')),
  bannerUrl:   z.string().url().optional().or(z.literal('')),
  status:      z.enum(['active', 'archived', 'completed']).optional().default('active'),
  visibility:  z.enum(['public', 'members', 'private']).optional().default('private'),
  tagIds:      z.array(z.string().uuid()).optional().default([]),
})

export const updateCpSchema = createCpSchema.partial()

export const cpQuerySchema = z.object({
  q:       z.string().optional(),
  status:  z.enum(['active', 'archived', 'completed']).optional(),
  tagId:   z.string().uuid().optional(),
  page:    z.coerce.number().int().min(1).optional().default(1),
  limit:   z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type CreateCpInput  = z.infer<typeof createCpSchema>
export type UpdateCpInput  = z.infer<typeof updateCpSchema>
export type CpQuery        = z.infer<typeof cpQuerySchema>
