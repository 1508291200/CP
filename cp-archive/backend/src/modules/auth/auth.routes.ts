import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { loginSchema, registerSchema } from './auth.schema.js'
import * as authService from './auth.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { UnauthorizedError } from '../../shared/errors.js'

const auth = new Hono()

const COOKIE_NAME = 'cp_refresh_token'
const IS_PROD = process.env['NODE_ENV'] === 'production'

// POST /auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const data = c.req.valid('json')
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
})

// POST /auth/refresh - 用 Cookie 中的 Refresh Token 换新 Access Token
auth.post('/refresh', async (c) => {
  const refreshToken = getCookie(c, COOKIE_NAME)
  if (!refreshToken) throw new UnauthorizedError('No refresh token')

  const result = await authService.refresh(refreshToken)
  return c.json(success(result))
})

// POST /auth/logout
auth.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user')
  await authService.logout(user.userId)

  deleteCookie(c, COOKIE_NAME, { path: '/api/v1/auth' })
  return c.json(success(null))
})

// POST /auth/register - 需要邀请码
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json')
  const user = await authService.register(data)
  return c.json(success(user), 201)
})

// GET /auth/me - 获取当前用户信息
auth.get('/me', authMiddleware, async (c) => {
  const { userId } = c.get('user')
  const user = await authService.getMe(userId)
  return c.json(success(user))
})

export { auth as authRoutes }
