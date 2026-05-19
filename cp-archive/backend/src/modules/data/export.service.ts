import { eq, inArray } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import {
  cps, events, eventTags, characters, milestones, cpTags, tags,
} from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'

export interface ExportPayload {
  exportVersion: string
  exportedAt:   string
  data: {
    cps:        unknown[]
    events:     unknown[]
    eventTags:  unknown[]
    characters: unknown[]
    milestones: unknown[]
    cpTags:     unknown[]
    tags:       unknown[]
  }
}

/** 导出指定 CP 的所有数据 */
export async function exportCp(cpId: string): Promise<ExportPayload> {
  const db = getDb()

  const [cp] = await db.select().from(cps).where(eq(cps.id, cpId))
  if (!cp) throw new NotFoundError('CP', cpId)

  const [cpEvts, cpChars, cpMs, cpTagRels] = await Promise.all([
    db.select().from(events).where(eq(events.cpId, cpId)),
    db.select().from(characters).where(eq(characters.cpId, cpId)),
    db.select().from(milestones).where(eq(milestones.cpId, cpId)),
    db.select().from(cpTags).where(eq(cpTags.cpId, cpId)),
  ])

  const eventIds = cpEvts.map(e => e.id)
  const tagIds   = cpTagRels.map(r => r.tagId)

  const [evtTagRels, relatedTags] = await Promise.all([
    eventIds.length > 0
      ? db.select().from(eventTags).where(inArray(eventTags.eventId, eventIds))
      : Promise.resolve([]),
    tagIds.length > 0
      ? db.select().from(tags).where(inArray(tags.id, tagIds))
      : Promise.resolve([]),
  ])

  return {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      cps:        [cp],
      events:     cpEvts,
      eventTags:  evtTagRels,
      characters: cpChars,
      milestones: cpMs,
      cpTags:     cpTagRels,
      tags:       relatedTags,
    },
  }
}

/** 导出全站数据（owner/admin） */
export async function exportFull(): Promise<ExportPayload> {
  const db = getDb()

  const [allCps, allEvents, allEvtTags, allChars, allMs, allCpTags, allTags] = await Promise.all([
    db.select().from(cps),
    db.select().from(events),
    db.select().from(eventTags),
    db.select().from(characters),
    db.select().from(milestones),
    db.select().from(cpTags),
    db.select().from(tags),
  ])

  return {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    data: {
      cps:        allCps,
      events:     allEvents,
      eventTags:  allEvtTags,
      characters: allChars,
      milestones: allMs,
      cpTags:     allCpTags,
      tags:       allTags,
    },
  }
}
