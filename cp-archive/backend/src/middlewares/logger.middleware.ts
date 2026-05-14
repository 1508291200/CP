/**
 * 请求日志中间件
 * 记录每个请求的方法、路径、状态码和耗时
 */

import type { Context, Next } from 'hono'
import { getConfig } from '../config/index.js'

export async function loggerMiddleware(c: Context, next: Next): Promise<void> {
  const start = Date.now()
  const method = c.req.method
  const path = c.req.path
  const requestId = crypto.randomUUID()

  // 将 requestId 注入到 context，方便后续中间件使用
  c.set('requestId', requestId)

  await next()

  const duration = Date.now() - start
  const status = c.res.status

  const config = getConfig()
  const logEntry = {
    requestId,
    method,
    path,
    status,
    duration,
    timestamp: new Date().toISOString(),
  }

  if (config.NODE_ENV === 'production') {
    // 生产环境：JSON 格式，便于日志收集工具解析
    console.log(JSON.stringify(logEntry))
  } else {
    // 开发环境：可读格式
    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'
    console.log(
      `${statusColor}${status}\x1b[0m ${method} ${path} \x1b[90m${duration}ms [${requestId.slice(0, 8)}]\x1b[0m`,
    )
  }
}

// 扩展 Hono Context 类型，支持 requestId
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string
  }
}
