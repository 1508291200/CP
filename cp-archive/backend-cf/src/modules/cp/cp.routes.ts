import { Hono } from 'hono'
import { z } from 'zod'
import { createCpSchema, updateCpSchema, cpQuerySchema } from './cp.schema.js'
import * as cpService from './cp.service.js'
import * as cpMembersService from './cp.members.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/permission.middleware.js'
import { cpPermissionMiddleware } from '../../middlewares/cp-permission.middleware.js'
import { ValidationError } from '../../shared/errors.js'
import type { Env } from '../../types/env.js'
import type { UserRole } from '../../db/schema/users.js'

const cp = new Hono<{ Bindings: Env }>()

// 所有 CP 接口需要登录
cp.use('*', authMiddleware)

// GET /cps
cp.get('/', async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams)
  const parsed = cpQuerySchema.safeParse(raw)
  if (!parsed.success) throw new ValidationError('查询参数错误', parsed.error.flatten())
  const result = await cpService.listCps(parsed.data, c.env)
  return c.json(success(result.items, result.meta))
})

// POST /cps
cp.post('/', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = createCpSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  const cp_ = await cpService.createCp(parsed.data, c.env, c.get('user').userId)
  return c.json(success(cp_), 201)
})

// GET /cps/:id
cp.get('/:id', async (c) => {
  return c.json(success(await cpService.getCpById(c.req.param('id'), c.env)))
})

// PATCH /cps/:id
cp.patch('/:id', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = updateCpSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await cpService.updateCp(c.req.param('id'), parsed.data, c.env)))
})

// DELETE /cps/:id
cp.delete('/:id', requireRole('admin'), async (c) => {
  await cpService.deleteCp(c.req.param('id'), c.env)
  return c.json(success(null))
})

// ── 成员管理 ────────────────────────────────────────────────────────────────

// GET /cps/:id/members
cp.get('/:id/members', cpPermissionMiddleware('cp_member:manage'), async (c) => {
  return c.json(success(await cpMembersService.listCpMembers(c.req.param('id'), c.env)))
})

// POST /cps/:id/members
cp.post('/:id/members', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    userId: z.string(),
    cpRole: z.enum(['cp_admin', 'editor', 'viewer']),
  }).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  const member = await cpMembersService.addCpMember(c.req.param('id'), parsed.data.userId, parsed.data.cpRole, c.env)
  return c.json(success(member), 201)
})

// PATCH /cps/:id/members/:userId
cp.patch('/:id/members/:userId', cpPermissionMiddleware('cp_member:manage'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ cpRole: z.enum(['cp_admin', 'editor', 'viewer']) }).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  const updated = await cpMembersService.updateCpMemberRole(
    c.req.param('id'),
    c.req.param('userId'),
    parsed.data.cpRole,
    c.get('user').role as UserRole,
    c.env,
  )
  return c.json(success(updated))
})

// DELETE /cps/:id/members/:userId
cp.delete('/:id/members/:userId', cpPermissionMiddleware('cp_member:manage'), async (c) => {
  await cpMembersService.removeCpMember(
    c.req.param('id'),
    c.req.param('userId'),
    c.get('user').role as UserRole,
    c.env,
  )
  return c.json(success(null))
})

export { cp as cpRoutes }
