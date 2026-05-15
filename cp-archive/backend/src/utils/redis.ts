/**
 * Redis 客户端（轻量封装）
 * 使用 node:net 直接实现简单的 Redis 命令，避免引入 ioredis 增加体积
 * 若需要更完整的 Redis 功能，可替换为 ioredis
 */

import { createClient } from '@redis/client'
import { getConfig } from '../config/index.js'

let _redis: ReturnType<typeof createClient> | null = null

export async function getRedis() {
  if (!_redis) {
    const config = getConfig()
    _redis = createClient({ url: config.REDIS_URL })
    _redis.on('error', (err: Error) => console.error('[Redis] Error:', err.message))
    await _redis.connect()
    console.log('[Redis] Connected')
  }
  return _redis
}

export async function closeRedis() {
  if (_redis) {
    await _redis.disconnect()
    _redis = null
  }
}
