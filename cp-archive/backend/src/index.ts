/**
 * 应用入口
 *
 * 鉴权策略：
 * - /health, /auth  → 公开
 * - /tags GET       → 公开（读）；写操作由 tag 路由内部控制
 * - /cps/**         → 整体 authMiddleware，写操作各路由内通过 permissionMiddleware 控制
 */

import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ZodError } from 'zod'
import { getConfig } from './config/index.js'
import { loggerMiddleware } from './middlewares/logger.middleware.js'
import { authMiddleware } from './middlewares/auth.middleware.js'
import { securityHeaders } from './middlewares/security-headers.middleware.js'
import { AppError } from './shared/errors.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { buildTagRouter } from './modules/tag/tag.routes.js'
import { buildCpRouter } from './modules/cp/cp.routes.js'
import { buildEventRouter } from './modules/event/event.routes.js'
import { buildCharacterRouter } from './modules/character/character.routes.js'
import { buildMilestoneRouter } from './modules/milestone/milestone.routes.js'
import { buildMediaRouter } from './modules/media/media.routes.js'
import { buildSettingsRouter } from './modules/settings/settings.routes.js'
import { buildUserRouter } from './modules/user/user.routes.js'
import { buildDataRouter } from './modules/data/data.routes.js'
import { startImageWorker } from './jobs/queue.js'
import { buildNotificationRouter } from './modules/notification/notification.routes.js'
import { initNotificationListener } from './modules/notification/notification.service.js'
import { buildSearchRouter } from './modules/search/search.routes.js'

const config = getConfig()
const app = new Hono()

// ── 全局中间件 ─────────────────────────────────────────────
app.use('*', loggerMiddleware)
app.use('*', securityHeaders)

/**
 * CORS 配置：
 * - 开发环境：允许 Vite 开发服务器端口
 * - 生产环境：读取 ALLOWED_ORIGINS 环境变量（逗号分隔域名列表）
 * - 不使用通配符 '*'（与 credentials:true 冲突，且有安全风险）
 */
const devOrigins = ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173']
const corsOrigins: string[] = config.NODE_ENV === 'development'
  ? devOrigins
  : config.ALLOWED_ORIGINS.length > 0
    ? config.ALLOWED_ORIGINS
    : []  // 生产环境未配置时拒绝所有跨域（安全默认値）

app.use('/api/*', cors({
  origin:       corsOrigins,
  allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials:  true,
  maxAge:       86400,
}))

// ── 路由注册 ───────────────────────────────────────────
const api = new Hono()

// 公开
api.route('/health', healthRoutes)
api.route('/auth',   authRoutes)

// Tags（读公开，写需鉴权 - 在路由内处理）
api.route('/tags', buildTagRouter())

// CP 及子资源（整体需要登录）
api.use('/cps/*', authMiddleware)
api.route('/cps',                  buildCpRouter())
api.route('/cps/:cpId/events',     buildEventRouter())
api.route('/cps/:cpId/characters', buildCharacterRouter())
api.route('/cps/:cpId/milestones', buildMilestoneRouter())

// 媒体上传（需登录）
api.use('/media/*', authMiddleware)
api.route('/media', buildMediaRouter())

// 站点设置（GET 需登录，PATCH 需 admin+）
api.use('/settings/*', authMiddleware)
api.route('/settings', buildSettingsRouter())

// 用户管理（全部需要登录，各接口内部再做权限校验）
api.use('/users/*', authMiddleware)
api.route('/users', buildUserRouter())

// 数据管理（导入/导出/清空，需登录）
api.use('/data/*', authMiddleware)
api.route('/data', buildDataRouter())

// 通知系统（全部需要登录）
api.use('/notifications/*', authMiddleware)
api.route('/notifications', buildNotificationRouter())

// 全局搜索（需登录）
api.use('/search', authMiddleware)
api.route('/search', buildSearchRouter())

app.route('/api/v1', api)

// ── 404 ────────────────────────────────────────────────
app.notFound((c) =>
  c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404),
)

// ── 全局错误处理（Hono 推荐方式）──────────────────────
app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: err.flatten() } },
      400,
    )
  }
  if (err instanceof AppError) {
    return c.json(
      { success: false, error: { code: err.code, message: err.message } },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 500,
    )
  }
  console.error('[UnhandledError]', err)
  return c.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    500,
  )
})

// ── 启动 ───────────────────────────────────────────────
serve({ fetch: app.fetch, port: config.PORT }, (info) => {
  console.log(`\x1b[36m[Server]\x1b[0m http://localhost:${info.port} (${config.NODE_ENV})`)
  console.log(`\x1b[36m[Server]\x1b[0m Version: ${config.VERSION}`)
  // 启动图片处理 Worker
  startImageWorker()
  // 初始化通知监听器（进程内事件总线）
  initNotificationListener()
})

export default app
