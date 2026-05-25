/**
 * 限速中间件（Rate Limiting）
 *
 * 策略：基于 IP + 可选用户名维度的滑动窗口计数。
 * 后端：优先使用 Redis；Redis 不可用时自动降级为进程内 Map（重启后计数重置）。
 *
 * 设计要点：
 * - 纯函数工厂 rateLimit(options) => middleware，职责单一
 * - 不依赖 Hono 以外的框架，可在任意路由挂载
 * - Redis 不可用不会导致服务崩溃（fail-open，但会打印警告）
 */

import type { Context, Next } from 'hono'
import { getConfig } from '../config/index.js'

// ── 内存降级存储 ─────────────────────────────────────────
interface MemEntry { count: number; expiresAt: number }
const memStore = new Map<string, MemEntry>()

function memIncr(key: string, windowSec: number): number {
  const now = Date.now()
  const entry = memStore.get(key)
  if (!entry || entry.expiresAt < now) {
    memStore.set(key, { count: 1, expiresAt: now + windowSec * 1000 })
    return 1
  }
  entry.count++
  return entry.count
}

// 定期清理过期 key，防止内存泄漏（每 5 分钟）
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of memStore) {
    if (v.expiresAt < now) memStore.delete(k)
  }
}, 5 * 60 * 1000).unref()

// ── Redis 计数器 ──────────────────────────────────────────
async function redisIncr(key: string, windowSec: number): Promise<number> {
  const config = getConfig()
  // 若 Redis 未配置或为 disabled，使用内存降级
  if (!config.REDIS_URL || config.REDIS_URL === 'disabled') {
    return memIncr(key, windowSec)
  }

  try {
    const { getRedis } = await import('../utils/redis.js')
    const redis = await getRedis()
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSec)
    return count
  } catch (err) {
    console.warn('[RateLimit] Redis unavailable, falling back to in-memory:', (err as Error).message)
    return memIncr(key, windowSec)
  }
}

// ── 公共接口 ──────────────────────────────────────────────
export interface RateLimitOptions {
  /** 限速 key 生成函数，决定限速维度（IP、IP+用户名等） */
  key: (c: Context) => string
  /** 窗口内最大请求次数 */
  max: number
  /** 时间窗口（秒） */
  windowSec: number
  /** 超限时返回给客户端的消息 */
  message?: string
}

/**
 * 工厂函数 - 创建限速中间件
 * @example
 * router.post('/login',
 *   rateLimit({ key: c => `login:${clientIp(c)}`, max: 10, windowSec: 60 }),
 *   handler
 * )
 */
export function rateLimit(options: RateLimitOptions) {
  const { key, max, windowSec, message = '请求过于频繁，请稍后再试' } = options

  return async (c: Context, next: Next) => {
    const k = `ratelimit:${key(c)}`
    const count = await redisIncr(k, windowSec)

    // 返回标准限速响应头（RFC 6585）
    c.header('X-RateLimit-Limit', String(max))
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - count)))

    if (count > max) {
      c.header('Retry-After', String(windowSec))
      return c.json(
        { success: false, error: { code: 'TOO_MANY_REQUESTS', message } },
        429,
      )
    }

    await next()
  }
}

/**
 * 从请求中提取真实客户端 IP
 * 支持：CF-Connecting-IP（Cloudflare）、X-Forwarded-For（反代）、直连
 */
export function clientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}
