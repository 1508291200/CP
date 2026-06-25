/**
 * 用户管理路由 — D1 版本
 * 包含：个人资料、用户列表、角色管理、邀请码管理、停用账号
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { eq, like, desc, sql, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { users, invitations, operationLogs } from '../../db/schema/index.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/permission.middleware.js'
import { success } from '../../shared/response.js'
import { ValidationError, ForbiddenError, NotFoundError, ConflictError } from '../../shared/errors.js'
import { hashPassword } from '../../utils/hash.js'
import { newId } from '../../utils/id.js'
import type { Env } from '../../types/env.js'
import type { UserRole } from '../../db/schema/users.js'

const ROLE_WEIGHT: Record<string, number> = { owner: 50, admin: 40, cp_admin: 30, editor: 20, viewer: 10 }

const userRouter = new Hono<{ Bindings: Env }>()
userRouter.use('*', authMiddleware)

// ── 个人信息 ──────────────────────────────────────────────────────────────

userRouter.get('/me', async (c) => {
  const db = getDb(c.env.DB)
  const [user] = await db.select().from(users).where(eq(users.id, c.get('user').userId))
  if (!user) throw new NotFoundError('用户', c.get('user').userId)
  const { passwordHash: _, ...pub } = user
  return c.json(success(pub))
})

userRouter.patch('/me', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    displayName:  z.string().max(100).optional(),
    avatarUrl:    z.string().url().optional(),
    preferences:  z.record(z.unknown()).optional(),
    newPassword:  z.string().min(8).optional(),
    oldPassword:  z.string().optional(),
  }).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

  const db = getDb(c.env.DB)
  const userId = c.get('user').userId
  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  if (parsed.data.displayName !== undefined) updateData['displayName'] = parsed.data.displayName
  if (parsed.data.avatarUrl   !== undefined) updateData['avatarUrl']   = parsed.data.avatarUrl
  if (parsed.data.preferences !== undefined) updateData['preferences'] = JSON.stringify(parsed.data.preferences)

  if (parsed.data.newPassword) {
    updateData['passwordHash'] = await hashPassword(parsed.data.newPassword)
  }

  await db.update(users).set(updateData).where(eq(users.id, userId))
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  const { passwordHash: _, ...pub } = user!
  return c.json(success(pub))
})

// ── 用户列表（admin+）────────────────────────────────────────────────────

userRouter.get('/', requireRole('admin'), async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams)
  const parsed = z.object({
    q:     z.string().optional(),
    role:  z.string().optional(),
    page:  z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).safeParse(raw)
  if (!parsed.success) throw new ValidationError('查询参数错误', parsed.error.flatten())

  const { q, role, page, limit } = parsed.data
  const db = getDb(c.env.DB)
  const offset = (page - 1) * limit

  const conditions = []
  if (q)    conditions.push(like(users.username, `%${q}%`))
  if (role) conditions.push(eq(users.role, role))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db.select({ id: users.id, username: users.username, email: users.email, role: users.role, displayName: users.displayName, isActive: users.isActive, createdAt: users.createdAt })
      .from(users).where(where).orderBy(desc(users.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users).where(where),
  ])

  const total = Number(countResult[0]?.count ?? 0)
  return c.json(success(items, { total, page, limit, hasMore: page * limit < total }))
})

// ── 修改全站角色（admin+）────────────────────────────────────────────────

userRouter.patch('/:id/role', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ role: z.enum(['admin', 'cp_admin', 'editor', 'viewer']) }).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

  const operator = c.get('user')
  const targetId = c.req.param('id')

  // 不能修改权重 >= 自己的用户
  const db = getDb(c.env.DB)
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId))
  if (!target) throw new NotFoundError('用户', targetId)
  if ((ROLE_WEIGHT[target.role] ?? 0) >= (ROLE_WEIGHT[operator.role] ?? 0)) {
    throw new ForbiddenError('无权修改此用户的角色')
  }

  await db.update(users).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(users.id, targetId))
  const [updated] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, targetId))
  return c.json(success(updated))
})

// ── 停用账号（admin+）───────────────────────────────────────────────────

userRouter.delete('/:id', requireRole('admin'), async (c) => {
  const operator = c.get('user')
  const targetId = c.req.param('id')

  if (targetId === operator.userId) throw new ForbiddenError('不能停用自己的账号')

  const db = getDb(c.env.DB)
  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId))
  if (!target) throw new NotFoundError('用户', targetId)
  if ((ROLE_WEIGHT[target.role] ?? 0) >= (ROLE_WEIGHT[operator.role] ?? 0)) {
    throw new ForbiddenError('无权停用此用户')
  }

  await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, targetId))
  return c.json(success(null))
})

// ── 邀请码管理（admin+）─────────────────────────────────────────────────

userRouter.post('/invite', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    role:      z.enum(['admin', 'cp_admin', 'editor', 'viewer']).default('editor'),
    maxUses:   z.number().int().min(1).max(100).default(1),
    expiresAt: z.string().datetime().optional(),
    label:     z.string().max(100).optional(),
  }).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

  const db = getDb(c.env.DB)
  const id   = newId()
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 24)

  await db.insert(invitations).values({
    id,
    code,
    role:      parsed.data.role,
    maxUses:   parsed.data.maxUses,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    label:     parsed.data.label ?? null,
    createdBy: c.get('user').userId,
    createdAt: new Date(),
  })

  const [invite] = await db.select().from(invitations).where(eq(invitations.id, id))
  return c.json(success(invite), 201)
})

userRouter.get('/invitations', requireRole('admin'), async (c) => {
  const db = getDb(c.env.DB)
  const items = await db.select().from(invitations).orderBy(desc(invitations.createdAt))
  return c.json(success(items))
})

userRouter.delete('/invitations/:code', requireRole('admin'), async (c) => {
  const db = getDb(c.env.DB)
  const [invite] = await db.select({ id: invitations.id, createdBy: invitations.createdBy })
    .from(invitations).where(eq(invitations.code, c.req.param('code')))
  if (!invite) throw new NotFoundError('邀请码', c.req.param('code'))

  const operator = c.get('user')
  if (invite.createdBy !== operator.userId && operator.role !== 'owner') {
    throw new ForbiddenError('只能撤销自己创建的邀请码')
  }

  await db.delete(invitations).where(eq(invitations.code, c.req.param('code')))
  return c.json(success(null))
})

// ── 操作日志（admin+）───────────────────────────────────────────────────

userRouter.get('/logs', requireRole('admin'), async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams)
  const parsed = z.object({
    page:         z.coerce.number().int().min(1).default(1),
    limit:        z.coerce.number().int().min(1).max(100).default(50),
    action:       z.string().optional(),
    resourceType: z.string().optional(),
  }).safeParse(raw)
  if (!parsed.success) throw new ValidationError('查询参数错误', parsed.error.flatten())

  const { page, limit } = parsed.data
  const offset = (page - 1) * limit
  const db = getDb(c.env.DB)

  const items = await db.select().from(operationLogs)
    .orderBy(desc(operationLogs.createdAt)).limit(limit).offset(offset)

  return c.json(success(items))
})

export { userRouter as userRoutes }
