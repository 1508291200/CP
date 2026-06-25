/**
 * 权限检查中间件
 * 基于角色的权限体系：owner > admin > cp_admin > editor > viewer
 */
import { createMiddleware } from 'hono/factory'
import { ForbiddenError } from '../shared/errors.js'
import type { Env } from '../types/env.js'

export type UserRole = 'owner' | 'admin' | 'cp_admin' | 'editor' | 'viewer'

const ROLE_WEIGHT: Record<UserRole, number> = {
  owner:    50,
  admin:    40,
  cp_admin: 30,
  editor:   20,
  viewer:   10,
}

/** 检查用户角色是否满足最低要求 */
export function hasRole(userRole: string, required: UserRole): boolean {
  const userWeight = ROLE_WEIGHT[userRole as UserRole] ?? 0
  const reqWeight  = ROLE_WEIGHT[required]
  return userWeight >= reqWeight
}

/** 权限中间件：要求最低角色 */
export function requireRole(minRole: UserRole) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user = c.get('user')
    if (!hasRole(user.role, minRole)) {
      throw new ForbiddenError(`需要 ${minRole} 或以上权限`)
    }
    await next()
  })
}
