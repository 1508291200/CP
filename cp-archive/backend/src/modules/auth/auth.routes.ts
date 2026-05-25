import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { loginSchema, registerSchema } from './auth.schema.js'
import * as authService from './auth.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { rateLimit, clientIp } from '../../middlewares/rate-limit.middleware.js'
import { UnauthorizedError } from '../../shared/errors.js'

const auth = new Hono()

const COOKIE_NAME = 'cp_refresh_token'
const IS_PROD = process.env['NODE_ENV'] === 'production'

// POST /auth/login  - IP: 10次/分钟；用户名: 5次/分钟（双维度，防暴力枚举）
auth.post('/login',
  rateLimit({ key: c => `login:ip:${clientIp(c)}`, max: 10, windowSec: 60 }),
  zValidator('json', loginSchema),
  async (c) => {
    const data = c.req.valid('json')

    // 用户名维度限速（在验证 body 之后执行，已知 username 合法）
    const userKey = `login:user:${data.username}`
    const { rateLimit: rl, clientIp: _ci } = await import('../../middlewares/rate-limit.middleware.js')
    const userRl = rl({ key: () => userKey, max: 5, windowSec: 60 })
    const limited = await userRl(c, async () => {})
    if (limited) return limited

    const result = await authService.login(data)

    // Refresh Token 存 HttpOnly Cookie（防 XSS）
    setCookie(c, COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure:   IS_PROD,
      sameSite: 'Strict',
      path:     '/api/v1/auth',
      maxAge:   7 * 24 * 60 * 60,
    })

    return c.json(success({ accessToken: result.accessToken, user: result.user }))
  }
)

// POST /auth/auth/refresh - 用 Cookie 中的 Refresh Token 换新 Access Token
auth.post('/refresh',
  rateLimit({ key: c => `refresh:ip:${clientIp(c)}`, max: 30, windowSec: 60 }),
  async (c) => {
    const refreshToken = getCookie(c, COOKIE_NAME)
    if (!refreshToken) throw new UnauthorizedError('No refresh token')

    const result = await authService.refresh(refreshToken)
    return c.json(success(result))
  }
)

// POST /auth/logout
auth.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user')
  await authService.logout(user.userId)

  deleteCookie(c, COOKIE_NAME, { path: '/api/v1/auth' })
  return c.json(success(null))
})

// POST /auth/register - 需要邀请码；每 IP 每小时限 20 次
auth.post('/register',
  rateLimit({ key: c => `register:ip:${clientIp(c)}`, max: 20, windowSec: 3600 }),
  zValidator('json', registerSchema),
  async (c) => {
    const data = c.req.valid('json')
    const user = await authService.register(data)
    return c.json(success(user), 201)
  }
)

// GET /auth/me - 获取当前用户信息
auth.get('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const user = await authService.getMe(userId)
  return c.json(success(user))
})

export { auth as authRoutes }
