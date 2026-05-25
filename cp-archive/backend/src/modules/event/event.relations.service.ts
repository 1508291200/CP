/**
 * 事件关联 Service
 * 职责：管理 event_relations 表（查询/新增/删除关联关系）
 * 不依赖 HTTP 上下文，纯数据库操作
 */
import { eq, or, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { eventRelations, events } from '../../db/schema/index.js'
import { NotFoundError, ValidationError } from '../../shared/errors.js'

export type RelationType = 'related' | 'caused_by' | 'led_to' | 'parallel'

export interface RelationItem {
  id:           string
  relationType: string
  createdAt:    string
  event: {
    id:          string
    title:       string
    eventDate:   string | null
    importance:  string
    isMilestone: boolean
  }
}

/**
 * 查询某个事件的所有关联事件（双向：source_id 或 target_id = eventId）
 */
export async function listRelations(cpId: string, eventId: string): Promise<RelationItem[]> {
  const db = getDb()

  // 验证事件属于该 CP
  const [ev] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.cpId, cpId)))
  if (!ev) throw new NotFoundError('Event', eventId)

  // 先拿作为 source 的关联
  const asSource = await db
    .select({
      id:           eventRelations.id,
      relationType: eventRelations.relationType,
      createdAt:    eventRelations.createdAt,
      eventId:      eventRelations.targetId,
    })
    .from(eventRelations)
    .where(eq(eventRelations.sourceId, eventId))

  // 再拿作为 target 的关联
  const asTarget = await db
    .select({
      id:           eventRelations.id,
      relationType: eventRelations.relationType,
      createdAt:    eventRelations.createdAt,
      eventId:      eventRelations.sourceId,
    })
    .from(eventRelations)
    .where(eq(eventRelations.targetId, eventId))

  const combined = [...asSource, ...asTarget]
  if (!combined.length) return []

  // 批量获取关联事件的基础信息
  const relatedEventIds = combined.map(r => r.eventId)
  const relatedEvents = await db
    .select({
      id:          events.id,
      title:       events.title,
      eventDate:   events.eventDate,
      importance:  events.importance,
      isMilestone: events.isMilestone,
    })
    .from(events)
    .where(or(...relatedEventIds.map(id => eq(events.id, id))))

  const eventMap = new Map(relatedEvents.map(e => [e.id, e]))

  return combined
    .filter(r => eventMap.has(r.eventId))
    .map(r => ({
      id:           r.id,
      relationType: r.relationType,
      createdAt:    r.createdAt.toISOString(),
      event:        eventMap.get(r.eventId)!,
    }))
}

/**
 * 新增关联（source ↔ target）
 * 校验：两端事件都属于同一 CP，不能自关联，不能重复
 */
export async function addRelation(
  cpId: string,
  sourceId: string,
  targetId: string,
  relationType: string = 'related',
) {
  if (sourceId === targetId) throw new ValidationError('不能将事件关联到自身')

  const db = getDb()

  // 校验两个事件都属于该 CP
  const [src, tgt] = await Promise.all([
    db.select({ id: events.id }).from(events).where(and(eq(events.id, sourceId), eq(events.cpId, cpId))),
    db.select({ id: events.id }).from(events).where(and(eq(events.id, targetId), eq(events.cpId, cpId))),
  ])
  if (!src.length) throw new NotFoundError('Event', sourceId)
  if (!tgt.length) throw new NotFoundError('Event', targetId)

  // 检查是否已存在（双向）
  const [exists] = await db
    .select({ id: eventRelations.id })
    .from(eventRelations)
    .where(
      or(
        and(eq(eventRelations.sourceId, sourceId), eq(eventRelations.targetId, targetId)),
        and(eq(eventRelations.sourceId, targetId), eq(eventRelations.targetId, sourceId)),
      ),
    )
  if (exists) throw new ValidationError('该关联已存在')

  const [created] = await db
    .insert(eventRelations)
    .values({ sourceId, targetId, relationType })
    .returning()
  return created
}

/**
 * 删除关联（只允许关联的两端事件的 CP 内操作）
 */
export async function removeRelation(cpId: string, relationId: string) {
  const db = getDb()

  // 通过 join 验证关联属于该 CP
  const [rel] = await db
    .select({ id: eventRelations.id })
    .from(eventRelations)
    .innerJoin(events, eq(eventRelations.sourceId, events.id))
    .where(and(eq(eventRelations.id, relationId), eq(events.cpId, cpId)))

  if (!rel) throw new NotFoundError('EventRelation', relationId)
  await db.delete(eventRelations).where(eq(eventRelations.id, relationId))
}
