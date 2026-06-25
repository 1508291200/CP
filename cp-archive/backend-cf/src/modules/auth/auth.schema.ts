/**
 * Auth 模块 Zod Schema（请求体校验）
 */
import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50),
  password: z.string().min(1, '密码不能为空'),
})

export const registerSchema = z.object({
  username:   z.string().min(2, '用户名至少 2 位').max(50).regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线、连字符'),
  email:      z.string().email('邮箱格式错误'),
  password:   z.string().min(8, '密码至少 8 位').max(100),
  inviteCode: z.string().min(1, '邀请码不能为空'),
})

export type LoginInput    = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
