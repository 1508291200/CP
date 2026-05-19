/**
 * 用户管理路由
 * 所有路由均需要登录（在 index.ts 中通过 authMiddleware 保护）
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import * as userService from './user.service.js'
import {
  updateMyProfileSchema,
  updateUserRoleSchema,
  generateInviteSchema,
  listUsersSchema,
} from './user.schema.js'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'
import { success } from '../../shared/response.js'

export function buildUserRouter() {
  const router = new Hono()

  // ── 个人信息 ────────────────────────────────────────────
  router.get('/me', async (c) => {
    const { userId } = c.get('user')
    return c.json(success(await userService.getMe(userId)))
  })

  router.patch('/me', zValidator('json', updateMyProfileSchema), async (c) => {
    const { userId } = c.get('user')
    const data = c.req.valid('json')
    return c.json(success(await userService.updateMe(userId, data)))
  })

  // ── 用户列表（admin+）────────────────────────────────────
  router.get('/', permissionMiddleware('member:manage'), zValidator('query', listUsersSchema), async (c) => {
    const query = c.req.valid('query')
    return c.json(success(await userService.listUsers(query)))
  })

  // ── 修改角色（admin+）───────────────────────────────────
  router.patch('/:id/role', permissionMiddleware('member:manage'), zValidator('json', updateUserRoleSchema), async (c) => {
    const { userId, role } = c.get('user')
    const targetId = c.req.param('id')
    const data = c.req.valid('json')
    return c.json(success(await userService.updateUserRole(targetId, data, userId, role)))
  })

  // ── 停用账号（admin+）───────────────────────────────────
  router.delete('/:id', permissionMiddleware('member:manage'), async (c) => {
    const { userId, role } = c.get('user')
    const targetId = c.req.param('id')!
    await userService.deactivateUser(targetId, userId, role)
    return c.json(success(null))
  })

  // ── 邀请码管理（admin+）─────────────────────────────────
  router.post('/invite', permissionMiddleware('member:manage'), zValidator('json', generateInviteSchema), async (c) => {
    const { userId } = c.get('user')
    const data = c.req.valid('json')
    const invite = await userService.generateInviteCode(data, userId)
    return c.json(success(invite), 201)
  })

  router.get('/invitations', permissionMiddleware('member:manage'), async (c) => {
    const invites = await userService.listInvitations()
    return c.json(success(invites))
  })

  router.delete('/invitations/:code', permissionMiddleware('member:manage'), async (c) => {
    const { userId, role } = c.get('user')
    const code = c.req.param('code')!
    await userService.revokeInvitation(code, userId, role)
    return c.json(success(null))
  })

  // ── 操作日志（admin+）───────────────────────────────────
  router.get('/logs', permissionMiddleware('log:view'), zValidator('query', z.object({
    page:  z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })), async (c) => {
    const query = c.req.valid('query')
    return c.json(success(await userService.listLogs(query)))
  })

  return router
}
