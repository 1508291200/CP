import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

/**
 * 密码强度规则（注册时校验）：
 * - 至少 8 位，最多 100 位
 * - 必须包含大写字母
 * - 必须包含小写字母
 * - 必须包含数字
 * - 必须包含特殊字符（非字母数字）
 *
 * 登录时不做强度校验（密码格式变更不应阻止历史用户登录）
 */
const passwordStrength = z.string()
  .min(8,  '密码至少 8 位')
  .max(100, '密码最多 100 位')
  .regex(/[A-Z]/,       '密码需包含至少一个大写字母')
  .regex(/[a-z]/,       '密码需包含至少一个小写字母')
  .regex(/[0-9]/,       '密码需包含至少一个数字')
  .regex(/[^A-Za-z0-9]/, '密码需包含至少一个特殊字符（如 !@#$%^&*）')

export const registerSchema = z.object({
  username:   z.string().min(2).max(50).regex(/^[a-zA-Z0-9_]+$/, '用户名只允许字母、数字和下划线'),
  email:      z.string().email(),
  password:   passwordStrength,
  inviteCode: z.string().min(1),
})

export type LoginInput    = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
