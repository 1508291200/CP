/**
 * 通知模块路由 — D1 版本（前端轮询模式）
 * 无 SSE，前端每 30 秒轮询 /notifications/unread-count
 */
import { Hono } from 'hono'
import { z } from 'zod'
import { eq, and, inArray, desc, sql } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { notifications } from '../../db/schema/index.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { success } from '../../shared/response.js'
import { ValidationError } from '../../shared/errors.js'
import type { Env } from '../../types/env.js'

const notifRouter = new Hono<{ Bindings: Env }>()
notifRouter.use('*', authMiddleware)

// GET /notifications?page&limit&unreadOnly
notifRouter.get('/', async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams)
  const parsed = z.object({
    page:       z.coerce.number().int().min(1).default(1),
    limit:      z.coerce.number().int().min(1).max(100).default(20),
    unreadOnly: z.coerce.boolean().default(false),
  }).safeParse(raw)
  if (!parsed.success) throw new ValidationError('查询参数错误', parsed.error.flatten())

  const { page, limit, unreadOnly } = parsed.data
  const userId = c.get('user').userId
  const offset = (page - 1) * limit
  const db = getDb(c.env.DB)

  const conditions = [eq(notifications.userId, userId)]
  if (unreadOnly) conditions.push(eq(notifications.isRead, false))
  const where = and(...conditions)

  const [items, countResult] = await Promise.all([
    db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(notifications).where(where),
  ])

  const total = Number(countResult[0]?.count ?? 0)
  return c.json(success(items, { total, page, limit, hasMore: page * limit < total }))
})

// GET /notifications/unread-count（轮询核心接口）
notifRouter.get('/unread-count', async (c) => {
  const userId = c.get('user').userId
  const db = getDb(c.env.DB)
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
  return c.json(success({ count: Number(result[0]?.count ?? 0) }))
})

// PATCH /notifications/read — 标记已读（all 或 ids）
notifRouter.patch('/read', async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.union([
    z.object({ all: z.literal(true) }),
    z.object({ ids: z.array(z.string()).min(1) }),
  ]).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())

  const userId = c.get('user').userId
  const db = getDb(c.env.DB)

  if ('all' in parsed.data) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId))
  } else {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), inArray(notifications.id, parsed.data.ids)))
  }

  return c.json(success(null))
})

// DELETE /notifications/:id
notifRouter.delete('/:id', async (c) => {
  const userId = c.get('user').userId
  const db = getDb(c.env.DB)
  await db.delete(notifications).where(and(eq(notifications.id, c.req.param('id')), eq(notifications.userId, userId)))
  return c.json(success(null))
})

export { notifRouter as notificationRoutes }
