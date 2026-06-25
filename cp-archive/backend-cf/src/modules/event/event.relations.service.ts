/**
 * 事件关联 Service — D1 版本
 */
import { eq, or, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { eventRelations, events } from '../../db/schema/index.js'
import { NotFoundError, ValidationError } from '../../shared/errors.js'
import { newId } from '../../utils/id.js'
import type { Env } from '../../types/env.js'

export type RelationType = 'related' | 'caused_by' | 'led_to' | 'parallel'

export async function listRelations(cpId: string, eventId: string, env: Env) {
  const db = getDb(env.DB)

  const [ev] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.cpId, cpId)))
  if (!ev) throw new NotFoundError('事件', eventId)

  const asSource = await db
    .select({ id: eventRelations.id, relationType: eventRelations.relationType, createdAt: eventRelations.createdAt, eventId: eventRelations.targetId })
    .from(eventRelations)
    .where(eq(eventRelations.sourceId, eventId))

  const asTarget = await db
    .select({ id: eventRelations.id, relationType: eventRelations.relationType, createdAt: eventRelations.createdAt, eventId: eventRelations.sourceId })
    .from(eventRelations)
    .where(eq(eventRelations.targetId, eventId))

  const combined = [...asSource, ...asTarget]
  if (!combined.length) return []

  const relatedEventIds = combined.map(r => r.eventId)
  const relatedEvents = await db
    .select({ id: events.id, title: events.title, eventDate: events.eventDate, importance: events.importance, isMilestone: events.isMilestone })
    .from(events)
    .where(or(...relatedEventIds.map(id => eq(events.id, id))))

  const eventMap = new Map(relatedEvents.map(e => [e.id, e]))

  return combined
    .filter(r => eventMap.has(r.eventId))
    .map(r => ({
      id:           r.id,
      relationType: r.relationType,
      createdAt:    r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      event:        eventMap.get(r.eventId)!,
    }))
}

export async function addRelation(cpId: string, sourceId: string, targetId: string, relationType: string = 'related', env: Env) {
  if (sourceId === targetId) throw new ValidationError('不能将事件关联到自身')
  const db = getDb(env.DB)

  const [[src], [tgt]] = await Promise.all([
    db.select({ id: events.id }).from(events).where(and(eq(events.id, sourceId), eq(events.cpId, cpId))),
    db.select({ id: events.id }).from(events).where(and(eq(events.id, targetId), eq(events.cpId, cpId))),
  ])
  if (!src) throw new NotFoundError('事件', sourceId)
  if (!tgt) throw new NotFoundError('事件', targetId)

  const [exists] = await db
    .select({ id: eventRelations.id })
    .from(eventRelations)
    .where(or(
      and(eq(eventRelations.sourceId, sourceId), eq(eventRelations.targetId, targetId)),
      and(eq(eventRelations.sourceId, targetId), eq(eventRelations.targetId, sourceId)),
    ))
  if (exists) throw new ValidationError('该关联已存在')

  const id = newId()
  await db.insert(eventRelations).values({ id, sourceId, targetId, relationType, createdAt: new Date() })
  const [created] = await db.select().from(eventRelations).where(eq(eventRelations.id, id))
  return created!
}

export async function removeRelation(cpId: string, relationId: string, env: Env) {
  const db = getDb(env.DB)
  const [rel] = await db
    .select({ id: eventRelations.id })
    .from(eventRelations)
    .innerJoin(events, eq(eventRelations.sourceId, events.id))
    .where(and(eq(eventRelations.id, relationId), eq(events.cpId, cpId)))
  if (!rel) throw new NotFoundError('事件关联', relationId)
  await db.delete(eventRelations).where(eq(eventRelations.id, relationId))
}
