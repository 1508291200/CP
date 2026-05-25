/**
 * 安全响应头中间件（Security Headers）
 *
 * 防御目标：
 * - X-Frame-Options / CSP frame-ancestors → 防点击劫持
 * - X-Content-Type-Options               → 防 MIME 嗅探
 * - X-XSS-Protection                     → 旧浏览器 XSS 兜底
 * - Strict-Transport-Security            → 强制 HTTPS（仅生产）
 * - Content-Security-Policy              → API 接口不返回 HTML，限制最小化
 * - Referrer-Policy                      → 不泄露 Referer 到第三方
 * - Permissions-Policy                   → 禁用不必要的浏览器能力
 * - Server                               → 隐藏服务器技术信息
 *
 * 设计：
 * - 纯函数中间件，无副作用，无外部依赖
 * - 通过 IS_PROD 标志控制生产专属头（HSTS），开发环境不干扰调试
 */

import type { Context, Next } from 'hono'
import { getConfig } from '../config/index.js'

export async function securityHeaders(c: Context, next: Next) {
  await next()

  const isProd = getConfig().NODE_ENV === 'production'

  // ── 防点击劫持 ────────────────────────────────────────
  c.header('X-Frame-Options', 'DENY')

  // ── 防 MIME 嗅探 ──────────────────────────────────────
  c.header('X-Content-Type-Options', 'nosniff')

  // ── XSS 过滤（旧浏览器兜底，现代浏览器依赖 CSP） ─────
  c.header('X-XSS-Protection', '1; mode=block')

  // ── Content Security Policy ───────────────────────────
  // API 接口不返回 HTML 页面，使用严格策略
  c.header('Content-Security-Policy', [
    "default-src 'none'",   // 默认禁止所有资源加载
    "frame-ancestors 'none'", // 禁止被嵌入 iframe
  ].join('; '))

  // ── 不泄露 Referrer 到第三方 ──────────────────────────
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')

  // ── 禁用不必要的浏览器特性 ────────────────────────────
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // ── 隐藏服务器技术信息 ────────────────────────────────
  c.header('Server', 'unknown')

  // ── HSTS（仅生产环境启用，开发环境 HTTPS 可能不可用）──
  if (isProd) {
    c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }
}
