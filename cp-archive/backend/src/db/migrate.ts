/**
 * 数据库迁移脚本
 * 执行：npm run db:migrate
 *
 * 注意：
 *   PostgreSQL 中 ALTER TYPE ADD VALUE 必须在独立事务中提交后才能在同一迁移中使用新值。
 *   本脚本先单独执行枚举扩展（自动提交），再运行标准 drizzle 迁移。
 */

import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import 'dotenv/config'
import { loadConfig } from '../config/index.js'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const config = loadConfig()
const __dirname = dirname(fileURLToPath(import.meta.url))

async function runMigrations() {
  console.log('[Migrate] Connecting to database...')
  const client = postgres(config.DATABASE_URL, { max: 1 })
  const db = drizzle(client)

  // ── 预处理：枚举扩展（必须独立事务提交）────────────────────────────────
  // 检查 cp_admin 是否已在枚举中
  const enumCheck = await client`
    SELECT enumlabel FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'cp_admin'
  `
  if (enumCheck.length === 0) {
    console.log('[Migrate] Adding cp_admin to user_role enum...')
    // 独立执行，不在事务中，自动提交
    await client.unsafe(`ALTER TYPE "user_role" ADD VALUE 'cp_admin' AFTER 'admin'`)
    console.log('[Migrate] ✅ Enum value added')
  } else {
    console.log('[Migrate] user_role.cp_admin already exists, skipping')
  }

  // ── 标准 drizzle 迁移 ──────────────────────────────────────────────────
  console.log('[Migrate] Running drizzle migrations...')
  await migrate(db, {
    migrationsFolder: join(__dirname, 'migrations'),
  })

  console.log('[Migrate] ✅ All migrations applied successfully')
  await client.end()
}

runMigrations().catch((err) => {
  console.error('[Migrate] ❌ Migration failed:', err)
  process.exit(1)
})
