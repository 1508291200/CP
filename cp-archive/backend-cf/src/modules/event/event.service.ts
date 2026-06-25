/**
 * 事件 Service — D1 版本
 *
 * 关键差异：
 * - ilike → like（SQLite 默认大小写不敏感）
 * - count(*)::int → count(*) 返回 number
 * - .returning() 不支持 → insert 后再 select
 * - jsonb 字段（content, customFields）→ JSON.stringify 存储
 * - emitNotification 移除（前端轮询替代实时通知）
 */
import { eq, and, gte, lte, like, inArray, sql, asc, desc } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import {
  events,
  eventTags,
  eventVersions,
  milestones,
} from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import { newId } from '../../utils/id.js'
import type { CreateEventInput, UpdateEventInput, EventQuery } from './event.schema.js'
import type { Env } from '../../types/env.js'

const MAX_EVENT_VERSIONS = 20

function paginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, hasMore: page * limit < total }
}

export async function listEvents(cpId: string, query: EventQuery, env: Env) {
  const db = getDb(env.DB)
  const { importance, dateStart, dateEnd, tagId, keyword, isMilestone, order, page, limit } = query
  const offset = (page - 1) * limit

  const conditions: ReturnType<typeof eq>[] = [eq(events.cpId, cpId)]
  if (importance)                conditions.push(eq(events.importance, importance))
  if (isMilestone !== undefined) conditions.push(eq(events.isMilestone, isMilestone))
  if (dateStart)                 conditions.push(gte(events.eventDate, dateStart))
  if (dateEnd)                   conditions.push(lte(events.eventDate, dateEnd))
  if (keyword)                   conditions.push(like(events.title, `%${keyword}%`))
  if (tagId) {
    const sub = db.select({ eventId: eventTags.eventId }).from(eventTags).where(eq(eventTags.tagId, tagId))
    conditions.push(inArray(events.id, sub))
  }

  const where   = and(...conditions)
  const orderBy = order === 'asc' ? asc(events.eventDate) : desc(events.eventDate)

  const [items, countResult] = await Promise.all([
    db.select().from(events).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(events).where(where),
  ])

  const total = Number(countResult[0]?.count ?? 0)
  return { items, meta: paginationMeta(total, page, limit) }
}

export async function getEventById(cpId: string, id: string, env: Env) {
  const db = getDb(env.DB)
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.cpId, cpId)))
  if (!event) throw new NotFoundError('事件', id)
  return event
}

export async function createEvent(cpId: string, data: CreateEventInput, env: Env, createdBy?: string) {
  const db = getDb(env.DB)
  const { tagIds, content, customFields, ...eventData } = data
  const id = newId()
  const now = new Date()

  await db.insert(events).values({
    id,
    cpId,
    ...eventData,
    content:      JSON.stringify(content ?? {}),
    customFields: JSON.stringify(customFields ?? {}),
    createdBy:    createdBy ?? null,
    createdAt:    now,
    updatedAt:    now,
  })

  if (tagIds && tagIds.length > 0) {
    await db.insert(eventTags).values(tagIds.map((tagId) => ({ eventId: id, tagId })))
  }

  // 若标记为里程碑，自动同步到 milestones 表
  if (eventData.isMilestone) {
    await db.insert(milestones).values({
      id:            newId(),
      cpId,
      eventId:       id,
      title:         eventData.title,
      description:   eventData.summary ?? null,
      milestoneDate: eventData.eventDate ?? null,
      createdAt:     now,
      updatedAt:     now,
    })
  }

  const [event] = await db.select().from(events).where(eq(events.id, id))
  return event!
}

export async function updateEvent(cpId: string, id: string, data: UpdateEventInput, env: Env, editedBy?: string) {
  const db = getDb(env.DB)
  const existing = await getEventById(cpId, id, env)

  // 保存版本快照
  await db.insert(eventVersions).values({
    id:        newId(),
    eventId:   id,
    snapshot:  JSON.stringify(existing),
    editedBy:  editedBy ?? null,
    createdAt: new Date(),
  })

  // FIFO：超过上限时删除最旧的版本
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventVersions)
    .where(eq(eventVersions.eventId, id))
  if (Number(countResult[0]?.count ?? 0) > MAX_EVENT_VERSIONS) {
    const oldest = await db
      .select({ id: eventVersions.id })
      .from(eventVersions)
      .where(eq(eventVersions.eventId, id))
      .orderBy(asc(eventVersions.createdAt))
      .limit(1)
    if (oldest[0]) {
      await db.delete(eventVersions).where(eq(eventVersions.id, oldest[0].id))
    }
  }

  const { tagIds, content, customFields, ...eventData } = data
  const updateData: Record<string, unknown> = { ...eventData, updatedAt: new Date() }
  if (content      !== undefined) updateData['content']      = JSON.stringify(content)
  if (customFields !== undefined) updateData['customFields'] = JSON.stringify(customFields)

  await db.update(events).set(updateData).where(eq(events.id, id))

  if (tagIds !== undefined) {
    await db.delete(eventTags).where(eq(eventTags.eventId, id))
    if (tagIds.length > 0) {
      await db.insert(eventTags).values(tagIds.map((tagId) => ({ eventId: id, tagId })))
    }
  }

  const [updated] = await db.select().from(events).where(eq(events.id, id))
  return updated!
}

export async function deleteEvent(cpId: string, id: string, env: Env) {
  const db = getDb(env.DB)
  await getEventById(cpId, id, env)
  await db.delete(events).where(eq(events.id, id))
}

export async function toggleMilestone(cpId: string, id: string, mark: boolean, env: Env) {
  const db = getDb(env.DB)
  const event = await getEventById(cpId, id, env)

  await db.update(events).set({ isMilestone: mark, updatedAt: new Date() }).where(eq(events.id, id))

  if (mark) {
    await db.insert(milestones).values({
      id:            newId(),
      cpId,
      eventId:       id,
      title:         event.title,
      description:   event.summary ?? null,
      milestoneDate: event.eventDate ?? null,
      createdAt:     new Date(),
      updatedAt:     new Date(),
    })
  } else {
    await db.delete(milestones).where(eq(milestones.eventId, id))
  }
}

// ── 版本历史 ────────────────────────────────────────────────────────────────

export async function listEventVersions(cpId: string, eventId: string, env: Env) {
  const db = getDb(env.DB)
  await getEventById(cpId, eventId, env)
  return db
    .select()
    .from(eventVersions)
    .where(eq(eventVersions.eventId, eventId))
    .orderBy(desc(eventVersions.createdAt))
}

export async function restoreEventVersion(
  cpId: string,
  eventId: string,
  versionId: string,
  env: Env,
  restoredBy?: string,
) {
  const db = getDb(env.DB)
  await getEventById(cpId, eventId, env)

  const [version] = await db
    .select()
    .from(eventVersions)
    .where(and(eq(eventVersions.id, versionId), eq(eventVersions.eventId, eventId)))
  if (!version) throw new NotFoundError('事件版本', versionId)

  const snap = JSON.parse(version.snapshot) as Record<string, unknown>

  // 快照当前状态后再还原
  const current = await getEventById(cpId, eventId, env)
  await db.insert(eventVersions).values({
    id:        newId(),
    eventId,
    snapshot:  JSON.stringify(current),
    editedBy:  restoredBy ?? null,
    createdAt: new Date(),
  })

  await db.update(events).set({
    title:         snap['title']         as string,
    summary:       (snap['summary']      as string | null) ?? null,
    content:       typeof snap['content'] === 'string' ? snap['content'] : JSON.stringify(snap['content'] ?? {}),
    eventDate:     (snap['eventDate']    as string | null) ?? null,
    datePrecision: (snap['datePrecision'] as 'year' | 'month' | 'day') ?? 'day',
    importance:    (snap['importance']   as 'critical' | 'high' | 'medium' | 'normal' | 'low') ?? 'normal',
    isMilestone:   Boolean(snap['isMilestone']),
    sourceRef:     (snap['sourceRef']    as string | null) ?? null,
    emotionIcon:   (snap['emotionIcon']  as string | null) ?? null,
    updatedAt:     new Date(),
  }).where(eq(events.id, eventId))

  const [restored] = await db.select().from(events).where(eq(events.id, eventId))
  return restored!
}

// ── 批量操作 ────────────────────────────────────────────────────────────────

export interface BatchUpdateInput {
  ids:           string[]
  importance?:   'critical' | 'high' | 'medium' | 'normal' | 'low'
  addTagIds?:    string[]
  removeTagIds?: string[]
}

export async function batchUpdateEvents(cpId: string, input: BatchUpdateInput, env: Env) {
  const db = getDb(env.DB)
  if (input.ids.length === 0) return { updated: 0 }

  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.cpId, cpId), inArray(events.id, input.ids)))
  const validIds = existing.map(e => e.id)
  if (validIds.length === 0) return { updated: 0 }

  if (input.importance) {
    await db.update(events).set({ importance: input.importance, updatedAt: new Date() }).where(inArray(events.id, validIds))
  }

  if (input.removeTagIds?.length) {
    await db.delete(eventTags).where(
      and(inArray(eventTags.eventId, validIds), inArray(eventTags.tagId, input.removeTagIds)),
    )
  }

  if (input.addTagIds?.length) {
    // D1 不支持 onConflictDoNothing，逐个 insert ignore
    for (const eid of validIds) {
      for (const tid of input.addTagIds) {
        try {
          await db.insert(eventTags).values({ eventId: eid, tagId: tid })
        } catch {
          // 重复键，忽略
        }
      }
    }
  }

  return { updated: validIds.length }
}

export async function batchDeleteEvents(cpId: string, ids: string[], env: Env) {
  const db = getDb(env.DB)
  if (ids.length === 0) return { deleted: 0 }

  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.cpId, cpId), inArray(events.id, ids)))
  const validIds = existing.map(e => e.id)
  if (validIds.length === 0) return { deleted: 0 }

  await db.delete(events).where(inArray(events.id, validIds))
  return { deleted: validIds.length }
}
