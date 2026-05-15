/**
 * JWT 认证中间件
 * 从 Authorization: Bearer <token> 提取并验证 token
 * 验证通过后将 { userId, role } 写入 Hono Context
 */

import type { Context, Next } from 'hono'
import { verifyAccessToken } from '../utils/jwt.js'
import { UnauthorizedError } from '../shared/errors.js'
import type { UserRole } from '../db/schema/users.js'

export interface AuthUser {
  userId: string
  role:   UserRole
}

// 扩展 Hono Context 类型
declare module 'hono' {
  interface ContextVariableMap {
    user:      AuthUser
    requestId: string
  }
}

export async function authMiddleware(c: Context, next: Next): Promise<void | Response> {
  const authorization = c.req.header('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header')
  }

  const token = authorization.slice(7)
  try {
    const payload = await verifyAccessToken(token)
    c.set('user', { userId: payload.userId, role: payload.role })
  } catch {
    throw new UnauthorizedError('Token expired or invalid')
  }

  await next()
}

/**
 * 可选认证中间件（不强制登录，但若有 token 则解析）
 * 用于公开接口中需要区分登录/未登录的场景
 */
export async function optionalAuthMiddleware(c: Context, next: Next): Promise<void> {
  const authorization = c.req.header('Authorization')

  if (authorization?.startsWith('Bearer ')) {
    try {
      const payload = await verifyAccessToken(authorization.slice(7))
      c.set('user', { userId: payload.userId, role: payload.role })
    } catch {
      // 忽略无效 token，继续处理
    }
  }

  await next()
}
