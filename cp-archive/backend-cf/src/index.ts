/**
 * CP Archive — Cloudflare Workers 后端入口
 * 运行时：Cloudflare Workers (Edge Runtime)
 * 框架：Hono v4
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { ZodError } from 'zod'
import type { Env } from './types/env.js'
import { securityHeaders } from './middlewares/security.middleware.js'
import { AppError } from './shared/errors.js'
import { failure } from './shared/response.js'

// ── 路由模块（后续 Phase 逐步引入）─────────────────────
import { healthRoutes } from './modules/health/health.routes.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { cpRoutes } from './modules/cp/cp.routes.js'
import { tagRoutes } from './modules/tag/tag.routes.js'
import { characterRoutes } from './modules/character/character.routes.js'
import { milestoneRoutes } from './modules/milestone/milestone.routes.js'
import { eventRoutes } from './modules/event/event.routes.js'
import { mediaRoutes } from './modules/media/media.routes.js'
import { searchRoutes } from './modules/search/search.routes.js'
import { notificationRoutes } from './modules/notification/notification.routes.js'
import { userRoutes } from './modules/user/user.routes.js'

const app = new Hono<{ Bindings: Env }>()

// ── 全局中间件 ─────────────────────────────────────────
app.use('*', logger())
app.use('*', securityHeaders)

// ── CORS 配置 ──────────────────────────────────────────
app.use('/api/*', cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
    ]
    if (!origin) return '*'
    if (allowed.includes(origin) || origin.endsWith('.pages.dev')) return origin
    return origin
  },
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// ── 路由挂载 ───────────────────────────────────────────
app.route('/api/v1', healthRoutes)
app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/cps', cpRoutes)
app.route('/api/v1/tags', tagRoutes)
// 嵌套路由：/cps/:cpId/characters 和 /cps/:cpId/milestones
app.route('/api/v1/cps/:cpId/characters', characterRoutes)
app.route('/api/v1/cps/:cpId/milestones', milestoneRoutes)
app.route('/api/v1/cps/:cpId/events', eventRoutes)
app.route('/api/v1/media', mediaRoutes)
app.route('/api/v1/search', searchRoutes)
app.route('/api/v1/notifications', notificationRoutes)
app.route('/api/v1/users', userRoutes)

// ── 404 兜底 ───────────────────────────────────────────
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: '接口不存在' } }, 404)
})

// ── 全局错误处理（onError 可捕获所有路由中的 throw）──────
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(failure(err.code, err.message, err.details), err.statusCode as never)
  }
  if (err instanceof ZodError) {
    return c.json(failure('VALIDATION_ERROR', '请求数据格式错误', err.flatten()), 400)
  }
  console.error('[UnhandledError]', err)
  return c.json(failure('INTERNAL_ERROR', '服务器内部错误'), 500)
})

export default app
