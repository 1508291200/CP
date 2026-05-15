/**
 * CP 模块 - Service 层（纯业务逻辑，不接触 HTTP）
 */

import { eq, ilike, and, inArray, sql, desc } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { cps, cpTags } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import { paginationMeta } from '../../shared/response.js'
import type { CreateCpInput, UpdateCpInput, CpQuery } from './cp.schema.js'

export async function listCps(query: CpQuery) {
  const db = getDb()
  const { q, status, tagId, page, limit } = query
  const offset = (page - 1) * limit

  // 构建过滤条件
  const conditions = []
  if (q)      conditions.push(ilike(cps.name, `%${q}%`))
  if (status) conditions.push(eq(cps.status, status))

  // 标签过滤：通过关联表查询
  if (tagId) {
    const cpIdsWithTag = db
      .select({ cpId: cpTags.cpId })
      .from(cpTags)
      .where(eq(cpTags.tagId, tagId))
    conditions.push(inArray(cps.id, cpIdsWithTag))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [items, [{ count }]] = await Promise.all([
    db
      .select()
      .from(cps)
      .where(where)
      .orderBy(desc(cps.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(cps).where(where),
  ])

  return { items, meta: paginationMeta(count, page, limit) }
}

export async function getCpById(id: string) {
  const db = getDb()
  const [cp] = await db.select().from(cps).where(eq(cps.id, id))
  if (!cp) throw new NotFoundError('CP', id)
  return cp
}

export async function createCp(data: CreateCpInput, createdBy?: string) {
  const db = getDb()
  const { tagIds, ...cpData } = data

  const [cp] = await db
    .insert(cps)
    .values({ ...cpData, createdBy: createdBy ?? null })
    .returning()

  if (tagIds && tagIds.length > 0) {
    await db.insert(cpTags).values(tagIds.map((tagId) => ({ cpId: cp.id, tagId })))
  }

  return cp
}

export async function updateCp(id: string, data: UpdateCpInput) {
  const db = getDb()
  // 先确认存在
  await getCpById(id)

  const { tagIds, ...cpData } = data
  const [updated] = await db
    .update(cps)
    .set({ ...cpData, updatedAt: new Date() })
    .where(eq(cps.id, id))
    .returning()

  // 更新标签关联（全量替换）
  if (tagIds !== undefined) {
    await db.delete(cpTags).where(eq(cpTags.cpId, id))
    if (tagIds.length > 0) {
      await db.insert(cpTags).values(tagIds.map((tagId) => ({ cpId: id, tagId })))
    }
  }

  return updated
}

export async function deleteCp(id: string) {
  const db = getDb()
  await getCpById(id)
  await db.delete(cps).where(eq(cps.id, id))
}
