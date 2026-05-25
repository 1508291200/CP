/**
 * 全局搜索 Service
 * 同时搜索：CP、事件、里程碑、人物
 * 只返回当前用户有权访问的数据（visibility 过滤由 CP 可见性决定）
 */
import { ilike, or, eq, and, inArray, sql } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { cps, events, milestones, characters } from '../../db/schema/index.js'

export interface SearchHit {
  type:      'cp' | 'event' | 'milestone' | 'character'
  id:        string
  cpId:      string | null
  title:     string
  subtitle?: string | null
  highlight?: string | null   // 简短摘要，命中片段
  url:       string           // 前端跳转路径
}

export interface SearchResult {
  query:    string
  total:    number
  hits:     SearchHit[]
}

const MAX_PER_TYPE = 5

/**
 * 全局搜索入口
 * @param query      搜索关键词（trim 后至少 1 字符）
 * @param userId     当前用户 id（用于可见性过滤）
 * @param cpIdFilter 可选：只在指定 CP 内搜索
 */
export async function globalSearch(
  query: string,
  userId: string,
  cpIdFilter?: string,
): Promise<SearchResult> {
  const q = query.trim()
  if (!q) return { query: q, total: 0, hits: [] }

  const db = getDb()
  const kw = `%${q}%`

  // 1. 获取当前用户可访问的 CP id 列表（public 或 members 或用户是成员）
  const { cpMembers } = await import('../../db/schema/index.js')

  let accessibleCpIds: string[] = []
  if (cpIdFilter) {
    accessibleCpIds = [cpIdFilter]
  } else {
    const memberRows = await db
      .select({ cpId: cpMembers.cpId })
      .from(cpMembers)
      .where(eq(cpMembers.userId, userId))

    const memberCpIds = memberRows.map(r => r.cpId)

    const allCps = await db
      .select({ id: cps.id, visibility: cps.visibility })
      .from(cps)

    accessibleCpIds = allCps
      .filter(c => c.visibility === 'public' || c.visibility === 'members' || memberCpIds.includes(c.id))
      .map(c => c.id)
  }

  if (!accessibleCpIds.length) return { query: q, total: 0, hits: [] }

  // 2. 并行搜索各资源类型
  const [cpHits, eventHits, milestoneHits, characterHits] = await Promise.all([
    // CP 搜索（仅当非 cpIdFilter 时搜 CP 自身）
    cpIdFilter
      ? Promise.resolve([] as SearchHit[])
      : db
          .select({ id: cps.id, name: cps.name, subtitle: cps.subtitle, description: cps.description })
          .from(cps)
          .where(and(
            inArray(cps.id, accessibleCpIds),
            or(ilike(cps.name, kw), ilike(cps.subtitle, kw), ilike(cps.description, kw)),
          ))
          .limit(MAX_PER_TYPE)
          .then(rows => rows.map(r => ({
            type:     'cp' as const,
            id:       r.id,
            cpId:     r.id,
            title:    r.name,
            subtitle: r.subtitle,
            highlight: r.description ? r.description.slice(0, 80) : null,
            url:      `/cp/${r.id}/timeline`,
          }))),

    // 事件搜索
    db
      .select({ id: events.id, cpId: events.cpId, title: events.title, summary: events.summary })
      .from(events)
      .where(and(
        inArray(events.cpId, accessibleCpIds),
        or(ilike(events.title, kw), ilike(events.summary, kw)),
      ))
      .orderBy(sql`events.event_date desc nulls last`)
      .limit(MAX_PER_TYPE)
      .then(rows => rows.map(r => ({
        type:      'event' as const,
        id:        r.id,
        cpId:      r.cpId,
        title:     r.title,
        highlight: r.summary ? r.summary.slice(0, 80) : null,
        url:       `/cp/${r.cpId}/timeline?eventId=${r.id}`,
      }))),

    // 里程碑搜索
    db
      .select({ id: milestones.id, cpId: milestones.cpId, title: milestones.title, description: milestones.description })
      .from(milestones)
      .where(and(
        inArray(milestones.cpId, accessibleCpIds),
        or(ilike(milestones.title, kw), ilike(milestones.description, kw)),
      ))
      .limit(MAX_PER_TYPE)
      .then(rows => rows.map(r => ({
        type:      'milestone' as const,
        id:        r.id,
        cpId:      r.cpId,
        title:     r.title,
        highlight: r.description ? r.description.slice(0, 80) : null,
        url:       `/cp/${r.cpId}/milestones`,
      }))),

    // 人物搜索
    db
      .select({ id: characters.id, cpId: characters.cpId, name: characters.name, bio: characters.bio })
      .from(characters)
      .where(and(
        inArray(characters.cpId, accessibleCpIds),
        or(ilike(characters.name, kw), ilike(characters.bio, kw)),
      ))
      .limit(MAX_PER_TYPE)
      .then(rows => rows.map(r => ({
        type:      'character' as const,
        id:        r.id,
        cpId:      r.cpId,
        title:     r.name,
        highlight: r.bio ? r.bio.slice(0, 80) : null,
        url:       `/cp/${r.cpId}/profile`,
      }))),
  ])

  const hits = [...cpHits, ...eventHits, ...milestoneHits, ...characterHits]
  return { query: q, total: hits.length, hits }
}
