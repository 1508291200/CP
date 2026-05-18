/**
 * Redis 客户端（支持降级：REDIS_URL=disabled 时使用内存 Map 模拟）
 *
 * 模拟 Redis 支持的命令：set / setEx / get / del
 * 仅用于开发/测试，不支持持久化和集群
 */

import { createClient } from '@redis/client'
import { getConfig } from '../config/index.js'

// ── 内存模拟 Redis ────────────────────────────────────
type MemEntry = { value: string; expiresAt: number | null }

class MemoryRedis {
  private store = new Map<string, MemEntry>()

  private isExpired(entry: MemEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, { value, expiresAt: null })
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (this.isExpired(entry)) { this.store.delete(key); return null }
    return entry.value
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }
}

// ── 统一导出类型 ─────────────────────────────────────

type RedisClient = {
  set(key: string, value: string): Promise<unknown>
  setEx(key: string, ttl: number, value: string): Promise<unknown>
  get(key: string): Promise<string | null>
  del(key: string): Promise<unknown>
}

let _redis: RedisClient | null = null

export async function getRedis(): Promise<RedisClient> {
  if (_redis) return _redis

  const config = getConfig()

  if (!config.REDIS_URL || config.REDIS_URL === 'disabled') {
    console.warn('[Redis] REDIS_URL not set or disabled — using in-memory fallback (dev only)')
    _redis = new MemoryRedis()
    return _redis
  }

  const client = createClient({ url: config.REDIS_URL })
  client.on('error', (err: Error) => console.error('[Redis] Error:', err.message))
  await client.connect()
  console.log('[Redis] Connected')
  _redis = client as unknown as RedisClient
  return _redis
}

export async function closeRedis() {
  if (_redis && 'disconnect' in (_redis as object)) {
    await (_redis as ReturnType<typeof createClient>).disconnect()
    _redis = null
  }
}
