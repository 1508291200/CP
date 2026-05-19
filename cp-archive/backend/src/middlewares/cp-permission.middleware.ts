/**
 * CP 级权限检查中间件
 *
 * 用法（在嵌套于 /cps/:cpId 的路由上）：
 *   router.patch('/:id', cpPermissionMiddleware('event:edit:own'), handler)
 *
 * 前提：必须先经过 authMiddleware（c.get('user') 已设置）
 *
 * 设计原则：
 *   - cpId 从路由参数 c.req.param('cpId') 读取（Hono 嵌套路由中可用）
 *   - 委托 checkCpPermission 实现双层判断（owner/admin 自动通行）
 *   - 此中间件不做 cpId 有效性验证，CP 不存在时 checkCpPermission 返回 false
 */

import type { Context, Next } from 'hono'
import { checkCpPermission } from '../shared/cp-permission.service.js'
import { ForbiddenError, UnauthorizedError } from '../shared/errors.js'

export function cpPermissionMiddleware(action: string) {
  return async (c: Context, next: Next): Promise<void | Response> => {
    const user = c.get('user')
    if (!user) throw new UnauthorizedError()

    // 从路由参数获取 cpId（支持 :cpId 和 :id 两种命名）
    const cpId = c.req.param('cpId') ?? c.req.param('id')
    if (!cpId) {
      throw new ForbiddenError('Missing cpId in route params')
    }

    const allowed = await checkCpPermission(user.userId, user.role, cpId, action)
    if (!allowed) {
      throw new ForbiddenError(`Action '${action}' is not allowed for this CP`)
    }

    await next()
  }
}
