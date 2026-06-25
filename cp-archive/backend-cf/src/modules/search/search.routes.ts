/**
 * 搜索路由 — D1 FTS5 版本
 * 使用 SQL MATCH 全文搜索（SQLite FTS5）
 */
import { Hono } from 'hono'
import { sql } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { success } from '../../shared/response.js'
import { ValidationError } from '../../shared/errors.js'
import type { Env } from '../../types/env.js'

const searchRouter = new Hono<{ Bindings: Env }>()
searchRouter.use('*', authMiddleware)

searchRouter.get('/', async (c) => {
  const q    = c.req.query('q')?.trim()
  const cpId = c.req.query('cpId')

  if (!q || q.length < 1) throw new ValidationError('搜索关键词不能为空')

  const db = getDb(c.env.DB)

  // FTS5 MATCH 查询（通过 events_fts 虚拟表）
  // 如果 cpId 存在则过滤，否则全局搜索
  // 注意：D1 的 FTS5 返回 rowid，需要 JOIN 回 events 表
  const cpFilter = cpId ? sql` AND e.cp_id = ${cpId}` : sql``

  const results = await db.run(sql`
    SELECT e.id, e.title, e.summary, e.event_date, e.importance, e.cp_id
    FROM events e
    JOIN events_fts f ON e.rowid = f.rowid
    WHERE events_fts MATCH ${q + '*'}
    ${cpFilter}
    ORDER BY rank
    LIMIT 50
  `)

  return c.json(success({
    events: results.results ?? [],
    total:  (results.results ?? []).length,
  }))
})

export { searchRouter as searchRoutes }
