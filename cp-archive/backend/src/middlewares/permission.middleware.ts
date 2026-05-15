/**
 * 权限检查中间件工厂函数
 * 用法：router.post('/', authMiddleware, permissionMiddleware('cp:create'), handler)
 *
 * 设计原则：
 * - 前提：必须先经过 authMiddleware（已写入 user）
 * - 查权限矩阵，无权则返回 403
 * - 返回工厂函数而非直接导出中间件，支持携带 action 参数
 */

import type { Context, Next } from 'hono'
import { ROLE_PERMISSIONS } from '../shared/constants.js'
import { ForbiddenError, UnauthorizedError } from '../shared/errors.js'

export function permissionMiddleware(action: string) {
  return async (c: Context, next: Next): Promise<void | Response> => {
    const user = c.get('user')
    if (!user) throw new UnauthorizedError()

    const allowed = ROLE_PERMISSIONS[action]
    if (!allowed || !allowed.includes(user.role)) {
      throw new ForbiddenError(`Action '${action}' is not allowed for role '${user.role}'`)
    }

    await next()
  }
}
