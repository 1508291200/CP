/**
 * CP 级别权限中间件
 * 检查用户是否是指定 CP 的成员且角色满足要求
 *
 * 全站 owner/admin 无视 CP 级别限制，直接通过
 */
import { createMiddleware } from 'hono/factory'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { cpMembers } from '../db/schema/index.js'
import { ForbiddenError } from '../shared/errors.js'
import { hasRole } from './permission.middleware.js'
import type { UserRole } from '../db/schema/users.js'
import type { Env } from '../types/env.js'

type CpAction = 'cp:update' | 'cp:delete' | 'cp_member:manage' | 'custom_tab:manage'

/** 各操作所需的 CP 内角色 */
const CP_ACTION_ROLE: Record<CpAction, 'cp_admin' | 'editor' | 'viewer'> = {
  'cp:update':         'cp_admin',
  'cp:delete':         'cp_admin',
  'cp_member:manage':  'cp_admin',
  'custom_tab:manage': 'cp_admin',
}

const CP_ROLE_WEIGHT: Record<string, number> = {
  cp_admin: 3,
  editor:   2,
  viewer:   1,
}

export function cpPermissionMiddleware(action: CpAction) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user  = c.get('user')
    const cpId  = c.req.param('id')

    // 全站 owner/admin 直接通过
    if (hasRole(user.role, 'admin')) {
      return next()
    }

    if (!cpId) throw new ForbiddenError('缺少 CP ID')

    const db = getDb(c.env.DB)
    const [member] = await db
      .select({ role: cpMembers.role })
      .from(cpMembers)
      .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, user.userId)))

    if (!member) throw new ForbiddenError('您不是此 CP 的成员')

    const required = CP_ACTION_ROLE[action]
    const userWeight = CP_ROLE_WEIGHT[member.role] ?? 0
    const reqWeight  = CP_ROLE_WEIGHT[required] ?? 0

    if (userWeight < reqWeight) {
      throw new ForbiddenError(`此操作需要 ${required} 或以上的 CP 权限`)
    }

    return next()
  })
}
