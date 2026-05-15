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
