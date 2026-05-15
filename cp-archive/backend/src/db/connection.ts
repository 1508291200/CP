/**
 * 数据库连接
 * 使用 postgres.js 驱动 + Drizzle ORM
 * 所有模块通过此处导入 db 实例，不直接创建连接
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getConfig } from '../config/index.js'
import * as schema from './schema/index.js'

let _db: ReturnType<typeof drizzle> | null = null
let _client: ReturnType<typeof postgres> | null = null

export function getDb() {
  if (!_db) {
    const config = getConfig()
    _client = postgres(config.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
    _db = drizzle(_client, { schema })
  }
  return _db
}

export async function closeDb() {
  if (_client) {
    await _client.end()
    _client = null
    _db = null
  }
}

export type Db = ReturnType<typeof getDb>
