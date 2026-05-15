/**
 * 数据库迁移脚本
 * 执行：npm run db:migrate
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

  console.log('[Migrate] Running migrations...')
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
