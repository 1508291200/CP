/**
 * JWT 认证中间件
 */
import { createMiddleware } from 'hono/factory'
import { jwtVerify } from 'jose'
import { UnauthorizedError } from '../shared/errors.js'
import type { Env } from '../types/env.js'

interface JWTPayload {
  userId: string
  role: string
  iat?: number
  exp?: number
}

// 声明 Hono context 变量类型（供其他路由使用 c.get('user')）
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload
  }
}

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('缺少 Authorization header')
  }

  const token = authHeader.slice(7)
  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    c.set('user', payload as unknown as JWTPayload)
    await next()
  } catch {
    throw new UnauthorizedError('Token 无效或已过期')
  }
})
