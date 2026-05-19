/**
 * 数据库初始数据脚本
 * 执行：npm run db:seed
 * 创建 Owner 账号 + 默认站点设置
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { loadConfig } from '../config/index.js'
import * as schema from './schema/index.js'

const config = loadConfig()

async function seed() {
  const client = postgres(config.DATABASE_URL, { max: 1 })
  const db = drizzle(client, { schema })

  console.log('[Seed] Starting...')

  // ── Owner 账号 ─────────────────────────────────────────────
  const ownerUsername = process.env.SEED_OWNER_USERNAME ?? 'admin'
  const ownerEmail    = process.env.SEED_OWNER_EMAIL    ?? 'admin@example.com'
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? 'changeme123'

  const existingOwner = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, ownerUsername))

  if (existingOwner.length === 0) {
    const passwordHash = await bcrypt.hash(ownerPassword, 12)
    await db.insert(schema.users).values({
      username:     ownerUsername,
      email:        ownerEmail,
      passwordHash,
      role:         'owner',
      displayName:  'Site Owner',
    })
    console.log(`[Seed] ✅ Owner account created: ${ownerUsername} / ${ownerPassword}`)
    console.log('[Seed] ⚠️  Please change the password after first login!')
  } else {
    console.log(`[Seed] Owner account already exists: ${ownerUsername}`)
  }

  // ── 默认站点设置 ───────────────────────────────────────────
  const defaultSettings: Array<{ key: string; value: unknown }> = [
    { key: 'site_name',        value: 'CP 档案站' },
    { key: 'site_description', value: '记录每一份心动的轨迹' },
    { key: 'registration',     value: 'invite_only' }, // open | invite_only | closed
    { key: 'global_theme',     value: { preset: 'default', customVars: {} } },
    { key: 'last_backup_at',   value: '' },
  ]

  for (const setting of defaultSettings) {
    const existing = await db
      .select()
      .from(schema.siteSettings)
      .where(eq(schema.siteSettings.key, setting.key))

    if (existing.length === 0) {
      await db.insert(schema.siteSettings).values({
        key:   setting.key,
        value: setting.value,
      })
      console.log(`[Seed] ✅ Setting: ${setting.key}`)
    }
  }

  console.log('[Seed] ✅ Done!')
  await client.end()
}

seed().catch((err) => {
  console.error('[Seed] ❌ Failed:', err)
  process.exit(1)
})
