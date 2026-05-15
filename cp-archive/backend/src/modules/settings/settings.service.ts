/**
 * 站点设置模块 - Service 层
 */
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { siteSettings } from '../../db/schema/index.js'

/** 获取所有站点设置（返回 key→value 字典） */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  const db   = getDb()
  const rows = await db.select().from(siteSettings)
  const result: Record<string, unknown> = {}
  for (const row of rows) {
    result[row.key] = row.value
  }
  return result
}

/** 获取单个设置值 */
export async function getSetting(key: string): Promise<unknown | null> {
  const db = getDb()
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key))
  return row?.value ?? null
}

/** 更新单个设置（upsert） */
export async function setSetting(key: string, value: unknown, updatedBy?: string) {
  const db = getDb()
  await db
    .insert(siteSettings)
    .values({ key, value: value as Record<string, unknown>, updatedBy: updatedBy ?? null })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value:     value as Record<string, unknown>,
        updatedBy: updatedBy ?? null,
        updatedAt: new Date(),
      },
    })
}

/** 批量更新设置（PATCH 接口用） */
export async function patchSettings(updates: Record<string, unknown>, updatedBy?: string) {
  for (const [key, value] of Object.entries(updates)) {
    await setSetting(key, value, updatedBy)
  }
}
