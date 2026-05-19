import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/connection.js'
import {
  cps, events, eventTags, characters, milestones, cpTags, tags,
} from '../../db/schema/index.js'
import { ValidationError } from '../../shared/errors.js'
import type { ExportPayload } from './export.service.js'

// 导入模式：merge = 按名称匹配合并，overwrite = 清空全部再插入
export type ImportMode = 'merge' | 'overwrite'

// 简单格式验证
const exportPayloadSchema = z.object({
  exportVersion: z.string(),
  exportedAt:    z.string(),
  data: z.object({
    cps:        z.array(z.record(z.unknown())),
    events:     z.array(z.record(z.unknown())),
    eventTags:  z.array(z.record(z.unknown())).optional().default([]),
    characters: z.array(z.record(z.unknown())).optional().default([]),
    milestones: z.array(z.record(z.unknown())).optional().default([]),
    cpTags:     z.array(z.record(z.unknown())).optional().default([]),
    tags:       z.array(z.record(z.unknown())).optional().default([]),
  }),
})

export interface ImportResult {
  mode:      ImportMode
  imported:  { cps: number; events: number; characters: number; milestones: number; tags: number }
  skipped:   number
  errors:    string[]
}

export async function importData(
  raw: unknown,
  mode: ImportMode,
  importedBy: string,
): Promise<ImportResult> {
  const parsed = exportPayloadSchema.safeParse(raw)
  if (!parsed.success) {
    throw new ValidationError('Invalid export file format', parsed.error.flatten())
  }

  const payload = parsed.data
  const db = getDb()
  const result: ImportResult = {
    mode,
    imported: { cps: 0, events: 0, characters: 0, milestones: 0, tags: 0 },
    skipped: 0,
    errors: [],
  }

  await db.transaction(async (tx) => {
    // ── overwrite 模式：清空所有数据 ──────────────────────
    if (mode === 'overwrite') {
      // 删除顺序遵守外键约束（子表先删）
      await tx.delete(eventTags)
      await tx.delete(cpTags)
      await tx.delete(milestones)
      await tx.delete(events)
      await tx.delete(characters)
      await tx.delete(cps)
      await tx.delete(tags)
    }

    // ── 导入 Tags ─────────────────────────────────────────
    const tagIdMap = new Map<string, string>() // 原始 id → 新 id
    for (const rawTag of payload.data.tags) {
      try {
        const name  = String(rawTag['name'] ?? '')
        const color = String(rawTag['color'] ?? '#7B5EA7')

        // merge 模式：按名称查是否已存在
        if (mode === 'merge') {
          const [existing] = await tx.select().from(tags).where(eq(tags.name, name)).limit(1)
          if (existing) {
            tagIdMap.set(String(rawTag['id']), existing.id)
            result.skipped++
            continue
          }
        }

        const [inserted] = await tx.insert(tags).values({
          name, color,
          category:  rawTag['category'] ? String(rawTag['category']) : null,
          createdBy: importedBy,
        }).returning()
        tagIdMap.set(String(rawTag['id']), inserted.id)
        result.imported.tags++
      } catch (e) {
        result.errors.push(`Tag: ${String(e)}`)
      }
    }

    // ── 导入 CPs ──────────────────────────────────────────
    const cpIdMap = new Map<string, string>()
    for (const rawCp of payload.data.cps) {
      try {
        const name = String(rawCp['name'] ?? '')

        if (mode === 'merge') {
          const [existing] = await tx.select().from(cps).where(eq(cps.name, name)).limit(1)
          if (existing) {
            cpIdMap.set(String(rawCp['id']), existing.id)
            result.skipped++
            continue
          }
        }

        const [inserted] = await tx.insert(cps).values({
          name,
          subtitle:    rawCp['subtitle']    ? String(rawCp['subtitle']) : null,
          description: rawCp['description'] ? String(rawCp['description']) : null,
          coverUrl:    rawCp['coverUrl']    ? String(rawCp['coverUrl']) : null,
          bannerUrl:   rawCp['bannerUrl']   ? String(rawCp['bannerUrl']) : null,
          visibility:  (rawCp['visibility'] as 'public' | 'members' | 'private') ?? 'private',
          createdBy:   importedBy,
        }).returning()
        cpIdMap.set(String(rawCp['id']), inserted.id)
        result.imported.cps++
      } catch (e) {
        result.errors.push(`CP "${rawCp['name']}": ${String(e)}`)
      }
    }

    // ── 导入 Characters ───────────────────────────────────
    for (const rawChar of payload.data.characters) {
      try {
        const newCpId = cpIdMap.get(String(rawChar['cpId']))
        if (!newCpId) { result.skipped++; continue }

        await tx.insert(characters).values({
          cpId:      newCpId,
          name:      String(rawChar['name'] ?? ''),
          avatarUrl: rawChar['avatarUrl'] ? String(rawChar['avatarUrl']) : null,
          roleLabel: rawChar['roleLabel'] ? String(rawChar['roleLabel']) : null,
          bio:       rawChar['bio']       ? String(rawChar['bio']) : null,
          aliases:   Array.isArray(rawChar['aliases']) ? rawChar['aliases'] as string[] : [],
        })
        result.imported.characters++
      } catch (e) {
        result.errors.push(`Character: ${String(e)}`)
      }
    }

    // ── 导入 Events ───────────────────────────────────────
    const eventIdMap = new Map<string, string>()
    for (const rawEvt of payload.data.events) {
      try {
        const newCpId = cpIdMap.get(String(rawEvt['cpId']))
        if (!newCpId) { result.skipped++; continue }

        const [inserted] = await tx.insert(events).values({
          cpId:          newCpId,
          title:         String(rawEvt['title'] ?? ''),
          summary:       rawEvt['summary']  ? String(rawEvt['summary']) : null,
          content:       (rawEvt['content'] as Record<string, unknown>) ?? {},
          eventDate:     rawEvt['eventDate'] ? String(rawEvt['eventDate']) : null,
          datePrecision: (rawEvt['datePrecision'] as 'year' | 'month' | 'day') ?? 'day',
          importance:    (rawEvt['importance'] as 'critical' | 'high' | 'medium' | 'normal' | 'low') ?? 'normal',
          isMilestone:   Boolean(rawEvt['isMilestone']),
          sourceRef:     rawEvt['sourceRef'] ? String(rawEvt['sourceRef']) : null,
          emotionIcon:   rawEvt['emotionIcon'] ? String(rawEvt['emotionIcon']) : null,
          createdBy:     importedBy,
        }).returning()
        eventIdMap.set(String(rawEvt['id']), inserted.id)
        result.imported.events++
      } catch (e) {
        result.errors.push(`Event "${rawEvt['title']}": ${String(e)}`)
      }
    }

    // ── 导入 Milestones ───────────────────────────────────
    for (const rawMs of payload.data.milestones) {
      try {
        const newCpId    = cpIdMap.get(String(rawMs['cpId']))
        const newEventId = rawMs['eventId'] ? eventIdMap.get(String(rawMs['eventId'])) : undefined
        if (!newCpId) { result.skipped++; continue }

        await tx.insert(milestones).values({
          cpId:          newCpId,
          eventId:       newEventId ?? null,
          title:         String(rawMs['title'] ?? ''),
          description:   rawMs['description'] ? String(rawMs['description']) : null,
          milestoneDate: rawMs['milestoneDate'] ? String(rawMs['milestoneDate']) : null,
          icon:          rawMs['icon'] ? String(rawMs['icon']) : '⭐',
        })
        result.imported.milestones++
      } catch (e) {
        result.errors.push(`Milestone: ${String(e)}`)
      }
    }

    // ── 导入 CP-Tag 关联 ──────────────────────────────────
    for (const rel of payload.data.cpTags) {
      try {
        const newCpId  = cpIdMap.get(String(rel['cpId']))
        const newTagId = tagIdMap.get(String(rel['tagId']))
        if (!newCpId || !newTagId) continue
        await tx.insert(cpTags).values({ cpId: newCpId, tagId: newTagId }).onConflictDoNothing()
      } catch { /* skip */ }
    }

    // ── 导入 Event-Tag 关联 ───────────────────────────────
    for (const rel of payload.data.eventTags) {
      try {
        const newEvtId = eventIdMap.get(String(rel['eventId']))
        const newTagId = tagIdMap.get(String(rel['tagId']))
        if (!newEvtId || !newTagId) continue
        await tx.insert(eventTags).values({ eventId: newEvtId, tagId: newTagId }).onConflictDoNothing()
      } catch { /* skip */ }
    }
  })

  return result
}
