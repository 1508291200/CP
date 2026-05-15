import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const registerSchema = z.object({
  username:   z.string().min(2).max(50).regex(/^[a-zA-Z0-9_]+$/, '用户名只允许字母、数字和下划线'),
  email:      z.string().email(),
  password:   z.string().min(8).max(100),
  inviteCode: z.string().min(1),
})

export type LoginInput    = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
