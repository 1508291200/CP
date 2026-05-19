import { eq, and, gte, lte, ilike, inArray, sql, asc, desc } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import {
  events,
  eventTags,
  eventVersions,
  milestones,
} from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'
import { paginationMeta } from '../../shared/response.js'
import { MAX_EVENT_VERSIONS } from '../../shared/constants.js'
import type { CreateEventInput, UpdateEventInput, EventQuery } from './event.schema.js'

export async function listEvents(cpId: string, query: EventQuery) {
  const db = getDb()
  const { importance, dateStart, dateEnd, tagId, keyword, isMilestone, order, page, limit } = query
  const offset = (page - 1) * limit

  const conditions = [eq(events.cpId, cpId)]
  if (importance)              conditions.push(eq(events.importance, importance))
  if (isMilestone !== undefined) conditions.push(eq(events.isMilestone, isMilestone))
  if (dateStart)               conditions.push(gte(events.eventDate, dateStart))
  if (dateEnd)                 conditions.push(lte(events.eventDate, dateEnd))
  if (keyword)                 conditions.push(ilike(events.title, `%${keyword}%`))
  if (tagId) {
    const sub = db.select({ eventId: eventTags.eventId }).from(eventTags).where(eq(eventTags.tagId, tagId))
    conditions.push(inArray(events.id, sub))
  }

  const where    = and(...conditions)
  const orderBy  = order === 'asc' ? asc(events.eventDate) : desc(events.eventDate)

  const [items, [{ count }]] = await Promise.all([
    db.select().from(events).where(where).orderBy(orderBy).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(where),
  ])

  return { items, meta: paginationMeta(count, page, limit) }
}

export async function getEventById(cpId: string, id: string) {
  const db = getDb()
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.cpId, cpId)))
  if (!event) throw new NotFoundError('Event', id)
  return event
}

export async function createEvent(cpId: string, data: CreateEventInput, createdBy?: string) {
  const db = getDb()
  const { tagIds, ...eventData } = data

  const [event] = await db
    .insert(events)
    .values({ ...eventData, cpId, createdBy: createdBy ?? null })
    .returning()

  if (tagIds && tagIds.length > 0) {
    await db.insert(eventTags).values(tagIds.map((tagId) => ({ eventId: event.id, tagId })))
  }

  // 若标记为里程碑，自动同步到 milestones 表
  if (eventData.isMilestone) {
    await db.insert(milestones).values({
      cpId,
      eventId:       event.id,
      title:         event.title,
      description:   event.summary ?? null,
      milestoneDate: event.eventDate ?? null,
    })
  }

  return event
}

export async function updateEvent(
  cpId: string,
  id: string,
  data: UpdateEventInput,
  editedBy?: string,
) {
  const db = getDb()
  const existing = await getEventById(cpId, id)

  // 保存版本快照（每次更新前存档）
  await db.insert(eventVersions).values({
    eventId:  id,
    snapshot: existing as Record<string, unknown>,
    editedBy: editedBy ?? null,
  })

  // FIFO：超过上限时删除最旧的版本
  const versionCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventVersions)
    .where(eq(eventVersions.eventId, id))
  if ((versionCount[0]?.count ?? 0) > MAX_EVENT_VERSIONS) {
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

  const { tagIds, ...eventData } = data
  const [updated] = await db
    .update(events)
    .set({ ...eventData, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning()

  if (tagIds !== undefined) {
    await db.delete(eventTags).where(eq(eventTags.eventId, id))
    if (tagIds.length > 0) {
      await db.insert(eventTags).values(tagIds.map((tagId) => ({ eventId: id, tagId })))
    }
  }

  return updated
}

export async function deleteEvent(cpId: string, id: string) {
  const db = getDb()
  await getEventById(cpId, id)
  await db.delete(events).where(eq(events.id, id))
}

export async function toggleMilestone(cpId: string, id: string, mark: boolean) {
  const db = getDb()
  const event = await getEventById(cpId, id)

  await db
    .update(events)
    .set({ isMilestone: mark, updatedAt: new Date() })
    .where(eq(events.id, id))

  if (mark) {
    await db.insert(milestones).values({
      cpId,
      eventId:       id,
      title:         event.title,
      description:   event.summary ?? null,
      milestoneDate: event.eventDate ?? null,
    })
  } else {
    await db.delete(milestones).where(eq(milestones.eventId, id))
  }
}

// ── 版本历史 ──────────────────────────────────────────────

/** 列出某事件的所有历史版本 */
export async function listEventVersions(cpId: string, eventId: string) {
  const db = getDb()
  await getEventById(cpId, eventId) // 确认事件存在且属于该 CP
  return db
    .select()
    .from(eventVersions)
    .where(eq(eventVersions.eventId, eventId))
    .orderBy(desc(eventVersions.createdAt))
}

/** 还原指定版本（将快照重写回 events 表） */
export async function restoreEventVersion(cpId: string, eventId: string, versionId: string, restoredBy?: string) {
  const db = getDb()
  await getEventById(cpId, eventId)

  const [version] = await db
    .select()
    .from(eventVersions)
    .where(and(eq(eventVersions.id, versionId), eq(eventVersions.eventId, eventId)))
  if (!version) throw new NotFoundError('EventVersion', versionId)

  const snap = version.snapshot as Record<string, unknown>

  // 保存当前版本到历史（在还原之前快照当前状态）
  const current = await getEventById(cpId, eventId)
  await db.insert(eventVersions).values({
    eventId,
    snapshot: current as Record<string, unknown>,
    editedBy: restoredBy ?? null,
  })

  // 还原
  const [restored] = await db
    .update(events)
    .set({
      title:         snap['title']         as string,
      summary:       (snap['summary']      as string | null) ?? null,
      content:       (snap['content']      as Record<string, unknown>) ?? {},
      eventDate:     (snap['eventDate']    as string | null) ?? null,
      datePrecision: (snap['datePrecision'] as 'year' | 'month' | 'day') ?? 'day',
      importance:    (snap['importance']   as 'critical' | 'high' | 'medium' | 'normal' | 'low') ?? 'normal',
      isMilestone:   Boolean(snap['isMilestone']),
      sourceRef:     (snap['sourceRef']    as string | null) ?? null,
      emotionIcon:   (snap['emotionIcon']  as string | null) ?? null,
      updatedAt:     new Date(),
    })
    .where(eq(events.id, eventId))
    .returning()

  return restored
}

// ── 批量操作 ──────────────────────────────────────────────

export interface BatchUpdateInput {
  ids:        string[]
  importance?: 'critical' | 'high' | 'medium' | 'normal' | 'low'
  addTagIds?:  string[]
  removeTagIds?: string[]
}

/** 批量更新重要性 / 添加或移除标签 */
export async function batchUpdateEvents(cpId: string, input: BatchUpdateInput) {
  const db = getDb()
  if (input.ids.length === 0) return { updated: 0 }

  // 验证所有 id 属于该 CP
  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.cpId, cpId), inArray(events.id, input.ids)))
  const validIds = existing.map(e => e.id)
  if (validIds.length === 0) return { updated: 0 }

  if (input.importance) {
    await db
      .update(events)
      .set({ importance: input.importance, updatedAt: new Date() })
      .where(inArray(events.id, validIds))
  }

  if (input.removeTagIds?.length) {
    await db.delete(eventTags).where(
      and(
        inArray(eventTags.eventId, validIds),
        inArray(eventTags.tagId, input.removeTagIds),
      ),
    )
  }

  if (input.addTagIds?.length) {
    const pairs = validIds.flatMap(eid =>
      input.addTagIds!.map(tid => ({ eventId: eid, tagId: tid })),
    )
    await db.insert(eventTags).values(pairs).onConflictDoNothing()
  }

  return { updated: validIds.length }
}

/** 批量删除事件 */
export async function batchDeleteEvents(cpId: string, ids: string[]) {
  const db = getDb()
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
