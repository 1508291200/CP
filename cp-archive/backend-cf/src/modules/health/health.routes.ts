/**
 * Health 检查路由
 * GET /api/v1/health → 返回服务状态
 */
import { Hono } from 'hono'
import type { Env } from '../../types/env.js'
import { success } from '../../shared/response.js'

const health = new Hono<{ Bindings: Env }>()

health.get('/health', async (c) => {
  // 检查 D1 连通性
  let dbStatus = 'ok'
  try {
    await c.env.DB.prepare('SELECT 1').first()
  } catch {
    dbStatus = 'error'
  }

  return c.json(success({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    version: '0.1.0',
    runtime: 'cloudflare-workers',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  }))
})

export { health as healthRoutes }
