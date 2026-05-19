import { eq, and, asc } from 'drizzle-orm'
import { z } from 'zod'
import { getDb } from '../../db/connection.js'
import { cpTabs } from '../../db/schema/index.js'
import { NotFoundError } from '../../shared/errors.js'

export const createTabSchema = z.object({
  name:      z.string().min(1).max(100),
  tabType:   z.enum(['profile', 'timeline', 'milestone', 'custom']).default('custom'),
  content:   z.record(z.unknown()).optional().default({}),
  sortOrder: z.number().int().optional().default(0),
  isVisible: z.boolean().optional().default(true),
})

export const updateTabSchema = createTabSchema.partial()

export type CreateTabInput = z.infer<typeof createTabSchema>
export type UpdateTabInput = z.infer<typeof updateTabSchema>

export async function listTabs(cpId: string) {
  return getDb()
    .select()
    .from(cpTabs)
    .where(eq(cpTabs.cpId, cpId))
    .orderBy(asc(cpTabs.sortOrder))
}

export async function createTab(cpId: string, data: CreateTabInput) {
  const db = getDb()
  const [tab] = await db.insert(cpTabs).values({ ...data, cpId }).returning()
  return tab
}

export async function updateTab(cpId: string, id: string, data: UpdateTabInput) {
  const db = getDb()
  const [existing] = await db.select().from(cpTabs).where(and(eq(cpTabs.id, id), eq(cpTabs.cpId, cpId)))
  if (!existing) throw new NotFoundError('CpTab', id)

  const [updated] = await db.update(cpTabs).set(data).where(eq(cpTabs.id, id)).returning()
  return updated
}

export async function deleteTab(cpId: string, id: string) {
  const db = getDb()
  const [existing] = await db.select().from(cpTabs).where(and(eq(cpTabs.id, id), eq(cpTabs.cpId, cpId)))
  if (!existing) throw new NotFoundError('CpTab', id)
  await db.delete(cpTabs).where(eq(cpTabs.id, id))
}

/** 批量更新排序 */
export async function reorderTabs(cpId: string, orderedIds: string[]) {
  const db = getDb()
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(cpTabs)
      .set({ sortOrder: i })
      .where(and(eq(cpTabs.id, orderedIds[i]), eq(cpTabs.cpId, cpId)))
  }
}
