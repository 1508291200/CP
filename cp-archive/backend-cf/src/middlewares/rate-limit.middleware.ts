/**
 * 简单 IP 限速中间件（Workers 内存级，不跨实例）
 *
 * 说明：Workers 是无状态的，每个实例各自计数。对于个人低流量项目，
 * 单实例内存限速已足够阻止大部分暴力攻击。高精度限速需要 Durable Objects。
 *
 * 使用方式：
 *   app.use('/auth/login', rateLimit({ max: 10, windowMs: 60_000 }))
 */
import type { MiddlewareHandler } from 'hono'

interface RateLimitOptions {
  /** 时间窗口内最大请求数 */
  max: number
  /** 时间窗口（毫秒）*/
  windowMs: number
  /** 自定义 key（默认 IP） */
  keyFn?: (c: Parameters<MiddlewareHandler>[0]) => string
}

// 内存存储：key → { count, resetAt }
const store = new Map<string, { count: number; resetAt: number }>()

export function rateLimit({ max, windowMs, keyFn }: RateLimitOptions): MiddlewareHandler {
  return async (c, next) => {
    const ip  = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
    const key = keyFn ? keyFn(c) : `rl:${ip}`
    const now = Date.now()

    const entry = store.get(key)
    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      c.res = new Response(
        JSON.stringify({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: '请求过于频繁，请稍后再试' } }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        },
      )
      return
    }

    entry.count++
    return next()
  }
}

/** 获取客户端真实 IP（Cloudflare Workers 环境） */
export function clientIp(c: Parameters<MiddlewareHandler>[0]): string {
  return c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown'
}
