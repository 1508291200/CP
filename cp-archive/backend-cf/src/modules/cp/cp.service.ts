/**
 * CP Service — D1 版本
 *
 * D1 差异：
 * - ilike → LIKE (SQLite 大小写不敏感，无需 ilike)
 * - count(*)::int → count(*) 返回值直接是 number
 * - .returning() 不可用 → insert 后再 select
 */
import { eq, like, and, inArray, sql, desc } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { cps, cpTags } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import { success } from '../../shared/response.js'
import { newId } from '../../utils/id.js'
import type { CreateCpInput, UpdateCpInput, CpQuery } from './cp.schema.js'
import type { Env } from '../../types/env.js'

function paginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, hasMore: page * limit < total }
}

export async function listCps(query: CpQuery, env: Env) {
  const db = getDb(env.DB)
  const { q, status, tagId, page, limit } = query
  const offset = (page - 1) * limit

  const conditions: ReturnType<typeof eq>[] = []
  if (q)      conditions.push(like(cps.name, `%${q}%`))
  if (status) conditions.push(eq(cps.status, status))

  if (tagId) {
    const cpIdsWithTag = db.select({ cpId: cpTags.cpId }).from(cpTags).where(eq(cpTags.tagId, tagId))
    conditions.push(inArray(cps.id, cpIdsWithTag))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, countResult] = await Promise.all([
    db.select().from(cps).where(where).orderBy(desc(cps.updatedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(cps).where(where),
  ])

  const total = Number(countResult[0]?.count ?? 0)
  return { items, meta: paginationMeta(total, page, limit) }
}

export async function getCpById(id: string, env: Env) {
  const db = getDb(env.DB)
  const [cp] = await db.select().from(cps).where(eq(cps.id, id))
  if (!cp) throw new NotFoundError('CP', id)
  return cp
}

export async function createCp(data: CreateCpInput, env: Env, createdBy?: string) {
  const db = getDb(env.DB)
  const { tagIds, ...cpData } = data
  const id = newId()
  const now = new Date()

  await db.insert(cps).values({
    id,
    ...cpData,
    themeConfig:  '{}',
    customFields: '[]',
    createdBy:    createdBy ?? null,
    createdAt:    now,
    updatedAt:    now,
  })

  if (tagIds && tagIds.length > 0) {
    await db.insert(cpTags).values(tagIds.map((tagId) => ({ cpId: id, tagId })))
  }

  const [cp] = await db.select().from(cps).where(eq(cps.id, id))
  return cp!
}

export async function updateCp(id: string, data: UpdateCpInput, env: Env) {
  const db = getDb(env.DB)
  await getCpById(id, env)

  const { tagIds, ...cpData } = data
  await db.update(cps).set({ ...cpData, updatedAt: new Date() }).where(eq(cps.id, id))

  if (tagIds !== undefined) {
    await db.delete(cpTags).where(eq(cpTags.cpId, id))
    if (tagIds.length > 0) {
      await db.insert(cpTags).values(tagIds.map((tagId) => ({ cpId: id, tagId })))
    }
  }

  const [updated] = await db.select().from(cps).where(eq(cps.id, id))
  return updated!
}

export async function deleteCp(id: string, env: Env) {
  const db = getDb(env.DB)
  await getCpById(id, env)
  await db.delete(cps).where(eq(cps.id, id))
}
