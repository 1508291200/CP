/**
 * Auth 路由（Workers 版本）
 *
 * 差异：
 * - process.env → c.env（Workers 绑定）
 * - @hono/zod-validator → 手动 parse（减少依赖，Workers bundle 更小）
 * - rateLimit 使用内存实现
 */
import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { loginSchema, registerSchema, forgotPasswordSchema, verifyResetCodeSchema, resetPasswordSchema } from './auth.schema.js'
import * as authService from './auth.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { rateLimit, clientIp } from '../../middlewares/rate-limit.middleware.js'
import { UnauthorizedError, ValidationError } from '../../shared/errors.js'
import type { Env } from '../../types/env.js'

const auth = new Hono<{ Bindings: Env }>()

const COOKIE_NAME = 'cp_refresh_token'

// 全 CF 方案：Cloudflare Pages（前端）与 Workers（后端）同属 CF 网络，
// 但部署在不同子域（pages.dev / workers.dev），Cookie 必须用 None+Secure
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true,
  sameSite: 'None' as const,
  path:     '/api/v1/auth',
  maxAge:   7 * 24 * 60 * 60,
}

// POST /auth/login
auth.post('/login',
  rateLimit({ max: 10, windowMs: 60_000 }),
  async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

    const result = await authService.login(parsed.data, c.env)
    setCookie(c, COOKIE_NAME, result.refreshToken, COOKIE_OPTS)
    return c.json(success({ accessToken: result.accessToken, user: result.user }))
  },
)

// POST /auth/refresh
auth.post('/refresh',
  rateLimit({ max: 30, windowMs: 60_000 }),
  async (c) => {
    const refreshToken = getCookie(c, COOKIE_NAME)
    if (!refreshToken) throw new UnauthorizedError('缺少 refresh token')

    const result = await authService.refresh(refreshToken, c.env)
    return c.json(success(result))
  },
)

// POST /auth/logout
auth.post('/logout', authMiddleware, async (c) => {
  const refreshToken = getCookie(c, COOKIE_NAME)
  if (refreshToken) {
    await authService.logout(refreshToken, c.env)
  }
  deleteCookie(c, COOKIE_NAME, {
    path:     '/api/v1/auth',
    sameSite: 'None',
    secure:   true,
  })
  return c.json(success(null))
})

// POST /auth/register
auth.post('/register',
  rateLimit({ max: 5, windowMs: 3_600_000 }),
  async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

    const user = await authService.register(parsed.data, c.env)
    return c.json(success(user), 201)
  },
)

// GET /auth/me
auth.get('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const user = await authService.getMe(userId, c.env)
  return c.json(success(user))
})

// POST /auth/forgot-password
auth.post('/forgot-password',
  rateLimit({ max: 5, windowMs: 3_600_000 }),  // 5次/小时
  async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = forgotPasswordSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

    // 无论邮箱是否存在，均返回相同响应（防止邮箱枚举）
    await authService.forgotPassword(parsed.data.email, c.env)
    return c.json({ success: true, data: null, message: '如果该邮箱已注册，验证码已发送，请查收邮件' })
  },
)

// POST /auth/verify-reset-code
auth.post('/verify-reset-code',
  rateLimit({ max: 10, windowMs: 15 * 60_000 }),  // 10次/15分钟
  async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = verifyResetCodeSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

    const resetToken = await authService.verifyResetCode(parsed.data.email, parsed.data.code, c.env)
    return c.json(success({ resetToken }))
  },
)

// POST /auth/reset-password
auth.post('/reset-password',
  rateLimit({ max: 5, windowMs: 15 * 60_000 }),  // 5次/15分钟
  async (c) => {
    const body = await c.req.json().catch(() => null)
    const parsed = resetPasswordSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

    await authService.resetPassword(parsed.data.resetToken, parsed.data.newPassword, c.env)
    return c.json({ success: true, data: null, message: '密码已成功重置，请使用新密码登录' })
  },
)

export { auth as authRoutes }
