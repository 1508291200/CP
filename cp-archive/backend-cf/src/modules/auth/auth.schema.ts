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

export const forgotPasswordSchema = z.object({
  email: z.string().email('邮箱格式错误'),
})

export const verifyResetCodeSchema = z.object({
  email: z.string().email('邮箱格式错误'),
  code:  z.string().length(6, '请输入6位验证码').regex(/^\d{6}$/, '验证码应为6位数字'),
})

export const resetPasswordSchema = z.object({
  resetToken:  z.string().min(1, '重置令牌不能为空'),
  newPassword: z.string().min(8, '密码至少8位').max(100),
})

export type LoginInput          = z.infer<typeof loginSchema>
export type RegisterInput       = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>
export type ResetPasswordInput  = z.infer<typeof resetPasswordSchema>
