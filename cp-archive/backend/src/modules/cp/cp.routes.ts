import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createCpSchema, updateCpSchema, cpQuerySchema } from './cp.schema.js'
import * as cpService from './cp.service.js'
import * as tabService from './cp.tabs.service.js'
import * as cpMembersService from './cp.members.service.js'
import * as userService from '../user/user.service.js'
import { generateCpInviteSchema } from '../user/user.schema.js'
import { success } from '../../shared/response.js'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'
import { cpPermissionMiddleware } from '../../middlewares/cp-permission.middleware.js'

export function buildCpRouter() {
  const router = new Hono()

  // ── CP 列表/创建 ──────────────────────────────────────────────────
  router.get('/', zValidator('query', cpQuerySchema), async (c) => {
    const result = await cpService.listCps(c.req.valid('query'))
    return c.json(success(result.items, result.meta))
  })

  router.post('/', permissionMiddleware('cp:create'),
    zValidator('json', createCpSchema), async (c) =>
      c.json(success(await cpService.createCp(c.req.valid('json'), c.get('user').userId)), 201))

  // ── CP 详情/更新/删除 ─────────────────────────────────────────────
  router.get('/:id', async (c) =>
    c.json(success(await cpService.getCpById(c.req.param('id')!))))

  // cp:update → CP 级权限（cp_admin 可更新自己负责的 CP）
  router.patch('/:id', cpPermissionMiddleware('cp:update'),
    zValidator('json', updateCpSchema), async (c) =>
      c.json(success(await cpService.updateCp(c.req.param('id')!, c.req.valid('json')))))

  router.delete('/:id', permissionMiddleware('cp:delete'), async (c) => {
    await cpService.deleteCp(c.req.param('id')!)
    return c.json(success(null))
  })

  // ── CP 成员管理 ───────────────────────────────────────────────────
  // GET  /:id/members   — cp_admin+ 可查看
  router.get('/:id/members', cpPermissionMiddleware('cp_member:manage'), async (c) => {
    const members = await cpMembersService.listCpMembers(c.req.param('id')!)
    return c.json(success(members))
  })

  // POST /:id/members   — 仅 owner/admin 可直接分配（全站权限）
  router.post('/:id/members', permissionMiddleware('member:manage'),
    zValidator('json', z.object({
      userId: z.string().uuid(),
      cpRole: z.enum(['cp_admin', 'editor']),
    })),
    async (c) => {
      const { userId: operatorId } = c.get('user')
      const { userId, cpRole } = c.req.valid('json')
      const member = await cpMembersService.addCpMember(c.req.param('id')!, userId, cpRole, operatorId)
      return c.json(success(member), 201)
    },
  )

  // PATCH /:id/members/:userId — cp_admin+ 可修改（受限制）
  router.patch('/:id/members/:userId', cpPermissionMiddleware('cp_member:manage'),
    zValidator('json', z.object({ cpRole: z.enum(['cp_admin', 'editor']) })),
    async (c) => {
      const { userId: operatorId, role: operatorGlobalRole } = c.get('user')
      const { cpRole } = c.req.valid('json')
      const updated = await cpMembersService.updateCpMemberRole(
        c.req.param('id')!,
        c.req.param('userId')!,
        cpRole,
        operatorId,
        operatorGlobalRole,
      )
      return c.json(success(updated))
    },
  )

  // DELETE /:id/members/:userId — cp_admin+ 可移除（受限制）
  router.delete('/:id/members/:userId', cpPermissionMiddleware('cp_member:manage'), async (c) => {
    const { userId: operatorId, role: operatorGlobalRole } = c.get('user')
    await cpMembersService.removeCpMember(
      c.req.param('id')!,
      c.req.param('userId')!,
      operatorId,
      operatorGlobalRole,
    )
    return c.json(success(null))
  })

  // ── CP 内邀请码（cp_admin，消耗配额）────────────────────────────
  // POST /:id/invite — cp_admin 生成 CP 绑定邀请码
  router.post('/:id/invite', cpPermissionMiddleware('cp_member:manage'),
    zValidator('json', generateCpInviteSchema.omit({ cpId: true })),
    async (c) => {
      const { userId: operatorId, role: operatorRole } = c.get('user')
      const data = c.req.valid('json')
      const invite = await userService.generateCpInviteCode(
        { ...data, cpId: c.req.param('id')! },
        operatorId,
        operatorRole,
      )
      return c.json(success(invite), 201)
    },
  )

  // GET /:id/invitations — 查看该 CP 的邀请码
  router.get('/:id/invitations', cpPermissionMiddleware('cp_member:manage'), async (c) => {
    const invites = await userService.listInvitations(undefined, c.req.param('id')!)
    return c.json(success(invites))
  })

  // ── 自定义 Tab ────────────────────────────────────────────────────
  router.get('/:id/tabs', async (c) =>
    c.json(success(await tabService.listTabs(c.req.param('id')!))))

  router.post('/:id/tabs', cpPermissionMiddleware('custom_tab:manage'),
    zValidator('json', tabService.createTabSchema), async (c) =>
      c.json(success(await tabService.createTab(c.req.param('id')!, c.req.valid('json'))), 201))

  router.patch('/:id/tabs/:tabId', cpPermissionMiddleware('custom_tab:manage'),
    zValidator('json', tabService.updateTabSchema), async (c) =>
      c.json(success(await tabService.updateTab(c.req.param('id')!, c.req.param('tabId')!, c.req.valid('json')))))

  router.delete('/:id/tabs/:tabId', cpPermissionMiddleware('custom_tab:manage'), async (c) => {
    await tabService.deleteTab(c.req.param('id')!, c.req.param('tabId')!)
    return c.json(success(null))
  })

  router.patch('/:id/tabs/reorder', cpPermissionMiddleware('custom_tab:manage'),
    zValidator('json', z.object({ ids: z.array(z.string().uuid()) })),
    async (c) => {
      await tabService.reorderTabs(c.req.param('id')!, c.req.valid('json').ids)
      return c.json(success(null))
    },
  )

  return router
}
