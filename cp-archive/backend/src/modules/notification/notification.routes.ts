/**
 * 通知模块路由
 * 所有路由均需要登录（在 index.ts 中通过 authMiddleware 保护）
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import * as notifService from './notification.service.js'
import type { NotificationType } from '../../shared/notification.types.js'
import { success } from '../../shared/response.js'

const VALID_TYPES = [
  'event:created', 'event:updated', 'event:deleted', 'event:milestone',
  'member:joined', 'member:role_changed', 'member:removed', 'cp:updated',
] as const

export function buildNotificationRouter() {
  const router = new Hono()

  // ── 通知列表（分页）────────────────────────────────────────────────
  router.get(
    '/',
    zValidator('query', z.object({
      page:       z.coerce.number().int().min(1).default(1),
      limit:      z.coerce.number().int().min(1).max(100).default(20),
      unreadOnly: z.coerce.boolean().default(false),
    })),
    async (c) => {
      const { userId } = c.get('user')
      const query = c.req.valid('query')
      const result = await notifService.listNotifications(userId, query)
      return c.json(success(result.items, result.meta))
    },
  )

  // ── 未读数（轮询用，轻量接口）─────────────────────────────────────
  router.get('/unread-count', async (c) => {
    const { userId } = c.get('user')
    const count = await notifService.getUnreadCount(userId)
    return c.json(success({ count }))
  })

  // ── 标记已读 ──────────────────────────────────────────────────────
  router.patch(
    '/read',
    zValidator('json', z.union([
      z.object({ all: z.literal(true) }),
      z.object({ ids: z.array(z.string().uuid()).min(1) }),
    ])),
    async (c) => {
      const { userId } = c.get('user')
      const body = c.req.valid('json')

      if ('all' in body && body.all) {
        await notifService.markAllRead(userId)
      } else if ('ids' in body) {
        await notifService.markRead(userId, body.ids)
      }

      return c.json(success(null))
    },
  )

  // ── 偏好设置：查询 ───────────────────────────────────────────────
  router.get(
    '/preferences',
    zValidator('query', z.object({
      cpId: z.string().uuid().optional(),
    })),
    async (c) => {
      const { userId } = c.get('user')
      const { cpId } = c.req.valid('query')
      const prefs = await notifService.getPreferences(userId, cpId)
      return c.json(success(prefs))
    },
  )

  // ── 偏好设置：单条更新 ────────────────────────────────────────────
  router.patch(
    '/preferences',
    zValidator('json', z.object({
      type:    z.enum(VALID_TYPES),
      enabled: z.boolean(),
      cpId:    z.string().uuid().optional(),
    })),
    async (c) => {
      const { userId } = c.get('user')
      const { type, enabled, cpId } = c.req.valid('json')
      await notifService.setPreference(userId, type as NotificationType, enabled, cpId)
      return c.json(success(null))
    },
  )

  // ── 偏好设置：批量更新 ────────────────────────────────────────────
  router.put(
    '/preferences/batch',
    zValidator('json', z.object({
      prefs: z.array(z.object({
        type:    z.enum(VALID_TYPES),
        enabled: z.boolean(),
        cpId:    z.string().uuid().optional(),
      })).min(1),
    })),
    async (c) => {
      const { userId } = c.get('user')
      const { prefs } = c.req.valid('json')
      await notifService.batchSetPreferences(
        userId,
        prefs.map((p) => ({ ...p, type: p.type as NotificationType })),
      )
      return c.json(success(null))
    },
  )

  return router
}
