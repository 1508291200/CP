/**
 * 健康检查路由
 * GET /api/v1/health - 返回服务状态、版本信息
 */

import { Hono } from 'hono'
import { getConfig } from '../../config/index.js'
import { success } from '../../shared/response.js'

const health = new Hono()

health.get('/', (c) => {
  const config = getConfig()
  return c.json(
    success({
      status: 'ok',
      version: config.VERSION,
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    }),
  )
})

export { health as healthRoutes }
