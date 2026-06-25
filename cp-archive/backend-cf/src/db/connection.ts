/**
 * D1 数据库连接
 * 使用 Drizzle ORM sqlite-core 适配 Cloudflare D1
 */
import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema/index.js'

export type DrizzleD1 = ReturnType<typeof getDb>

export function getDb(d1: D1Database) {
  return drizzle(d1, { schema })
}
