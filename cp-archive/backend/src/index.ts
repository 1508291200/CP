/**
 * 应用入口
 * 负责：初始化配置、注册中间件、挂载路由、启动服务器
 */

import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getConfig } from './config/index.js'
import { errorMiddleware } from './middlewares/error.middleware.js'
import { loggerMiddleware } from './middlewares/logger.middleware.js'
import { healthRoutes } from './modules/health/health.routes.js'

// 初始化配置（启动时验证所有必填环境变量）
const config = getConfig()

const app = new Hono()

// ── 全局中间件（顺序重要）────────────────────────────────
// 1. 错误处理（最外层，捕获所有后续中间件的错误）
app.use('*', errorMiddleware)

// 2. 请求日志
app.use('*', loggerMiddleware)

// 3. CORS（开发环境允许所有来源，生产环境通过 Nginx 控制）
app.use(
  '/api/*',
  cors({
    origin: config.NODE_ENV === 'development' ? '*' : [],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

// ── 路由挂载 ────────────────────────────────────────────
const api = new Hono()

// 健康检查（无鉴权）
api.route('/health', healthRoutes)

// 将所有 API 路由挂载到 /api/v1 前缀
app.route('/api/v1', api)

// 404 处理
app.notFound((c) => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404)
})

// ── 启动服务器 ───────────────────────────────────────────
serve(
  {
    fetch: app.fetch,
    port: config.PORT,
  },
  (info) => {
    console.log(`\x1b[36m[Server]\x1b[0m Started on http://localhost:${info.port}`)
    console.log(`\x1b[36m[Server]\x1b[0m Environment: ${config.NODE_ENV}`)
    console.log(`\x1b[36m[Server]\x1b[0m Version: ${config.VERSION}`)
  },
)

export default app
