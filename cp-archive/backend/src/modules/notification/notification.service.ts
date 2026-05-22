/**
 * 通知核心 Service
 *
 * 职责：
 *   1. 监听 notificationBus 的 'notification' 事件（initNotificationListener 初始化）
 *   2. 查询应接收通知的用户（CP 成员 + 全站 owner/admin）
 *   3. 过滤用户自定义偏好（disabled 的排除）
 *   4. 排除触发者自身
 *   5. 批量写入 notifications 表
 *   6. 提供查询/标记已读/偏好设置 API
 *
 * 与业务模块的解耦：
 *   - 业务模块只调用 emitNotification()，不依赖此服务
 *   - 此服务通过事件总线消费，无需业务模块感知
 */

import { eq, and, inArray, isNull, or, desc, sql } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import {
  notifications,
  notificationPreferences,
  users,
  cpMembers,
} from '../../db/schema/index.js'
import { notificationBus } from '../../shared/notification.emitter.js'
import type { NotificationPayload, NotificationType } from '../../shared/notification.types.js'
import type { UserRole } from '../../db/schema/users.js'
import { paginationMeta } from '../../shared/response.js'

// ── 最大通知保留条数（每个用户） ─────────────────────────────────────────────
const MAX_NOTIFICATIONS_PER_USER = 500

// ── 监听器初始化 ─────────────────────────────────────────────────────────────

let listenerInitialized = false

/**
 * 在应用启动时调用一次，挂载通知监听器
 * 幂等：多次调用只注册一次
 */
export function initNotificationListener(): void {
  if (listenerInitialized) return
  listenerInitialized = true

  notificationBus.on('notification', async (payload: NotificationPayload) => {
    try {
      await processNotification(payload)
    } catch (err) {
      // 通知失败不影响主流程，只记录错误
      console.error('[Notification] Failed to process notification:', err)
    }
  })

  console.log('[Notification] Listener initialized')
}

// ── 核心处理逻辑 ─────────────────────────────────────────────────────────────

async function processNotification(payload: NotificationPayload): Promise<void> {
  // 查询应接收通知的用户 ID 列表
  const recipientIds = await resolveRecipients(payload)
  if (recipientIds.length === 0) return

  // 过滤偏好（用户设置了 disabled 的排除）
  const filteredIds = await filterByPreferences(recipientIds, payload)
  if (filteredIds.length === 0) return

  // 批量写入
  await saveNotifications(filteredIds, payload)
}

/**
 * 根据通知 payload 解析应接收通知的用户 ID 列表
 *
 * 规则：
 *   - CP 级通知：CP 成员（cp_members 表） + 全站 owner/admin（users 表）
 *   - 排除触发者自身（actorId）
 */
async function resolveRecipients(payload: NotificationPayload): Promise<string[]> {
  const db = getDb()
  const recipientSet = new Set<string>()

  // 1. 全站 owner/admin 始终接收所有通知
  const globalAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      inArray(users.role, ['owner', 'admin'] as UserRole[]),
      eq(users.isActive, true),
    ))
  for (const u of globalAdmins) recipientSet.add(u.id)

  // 2. CP 成员（如果是 CP 级通知）
  if (payload.cpId) {
    const members = await db
      .select({ userId: cpMembers.userId })
      .from(cpMembers)
      .where(eq(cpMembers.cpId, payload.cpId))
    for (const m of members) recipientSet.add(m.userId)
  }

  // 3. 排除触发者自身（不给自己发通知）
  if (payload.actorId) recipientSet.delete(payload.actorId)

  return [...recipientSet]
}

/**
 * 根据用户偏好过滤接收者
 * 优先级：CP 级偏好 > 全站偏好 > 默认（开启）
 */
async function filterByPreferences(
  recipientIds: string[],
  payload: NotificationPayload,
): Promise<string[]> {
  if (recipientIds.length === 0) return []

  const db = getDb()

  // 查询所有相关偏好记录
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(and(
      inArray(notificationPreferences.userId, recipientIds),
      eq(notificationPreferences.type, payload.type as NotificationType),
      // 查 CP 级偏好（如有）和全站偏好
      or(
        payload.cpId
          ? eq(notificationPreferences.cpId, payload.cpId)
          : isNull(notificationPreferences.cpId),
        isNull(notificationPreferences.cpId),
      ),
    ))

  // 构建用户 → 最终 enabled 状态（CP 级偏好优先）
  const prefMap = new Map<string, boolean>()
  for (const pref of prefs) {
    const existing = prefMap.get(pref.userId)
    if (pref.cpId !== null) {
      // CP 级偏好优先覆盖全站偏好
      prefMap.set(pref.userId, pref.enabled)
    } else if (existing === undefined) {
      // 仅在没有 CP 级偏好时使用全站偏好
      prefMap.set(pref.userId, pref.enabled)
    }
  }

  // 默认开启（无记录 = 接收）；有记录且 enabled=false = 排除
  return recipientIds.filter((id) => prefMap.get(id) !== false)
}

/**
 * 批量写入通知记录
 */
async function saveNotifications(
  recipientIds: string[],
  payload: NotificationPayload,
): Promise<void> {
  if (recipientIds.length === 0) return
  const db = getDb()

  await db.insert(notifications).values(
    recipientIds.map((recipientId) => ({
      recipientId,
      type:       payload.type as NotificationType,
      cpId:       payload.cpId ?? null,
      actorId:    payload.actorId ?? null,
      entityId:   payload.entityId ?? null,
      entityType: payload.entityType ?? null,
      title:      payload.title,
      body:       payload.body ?? null,
    })),
  )
}

// ── 查询 API ─────────────────────────────────────────────────────────────────

export interface ListNotificationsQuery {
  page:       number
  limit:      number
  unreadOnly: boolean
}

export async function listNotifications(userId: string, query: ListNotificationsQuery) {
  const db = getDb()
  const { page, limit, unreadOnly } = query
  const offset = (page - 1) * limit

  const conditions = [eq(notifications.recipientId, userId)]
  if (unreadOnly) conditions.push(eq(notifications.isRead, false))

  const where = and(...conditions)

  const [items, [{ total }]] = await Promise.all([
    db.select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(notifications).where(where),
  ])

  return { items, meta: paginationMeta(total, page, limit) }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = getDb()
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(
      eq(notifications.recipientId, userId),
      eq(notifications.isRead, false),
    ))
  return count
}

export async function markRead(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = getDb()
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(
      eq(notifications.recipientId, userId),
      inArray(notifications.id, ids),
    ))
}

export async function markAllRead(userId: string): Promise<void> {
  const db = getDb()
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(
      eq(notifications.recipientId, userId),
      eq(notifications.isRead, false),
    ))
}

// ── 偏好设置 API ─────────────────────────────────────────────────────────────

export async function getPreferences(userId: string, cpId?: string) {
  const db = getDb()
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(and(
      eq(notificationPreferences.userId, userId),
      cpId ? eq(notificationPreferences.cpId, cpId) : isNull(notificationPreferences.cpId),
    ))
  return rows
}

export async function setPreference(
  userId:  string,
  type:    NotificationType,
  enabled: boolean,
  cpId?:   string,
): Promise<void> {
  const db = getDb()
  if (cpId) {
    // CP 级偏好
    await db.insert(notificationPreferences)
      .values({ userId, type, enabled, cpId })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.cpId,
          notificationPreferences.type,
        ],
        set: { enabled },
      })
  } else {
    // 全站偏好：cpId 为 NULL，利用 partial unique index
    // Drizzle 的 onConflictDoUpdate 不支持 partial index，使用 sql`` 原生
    await db.execute(
      sql`INSERT INTO notification_preferences (user_id, type, enabled, cp_id)
          VALUES (${userId}::uuid, ${type}::notification_type, ${enabled}, NULL)
          ON CONFLICT (user_id, type) WHERE cp_id IS NULL
          DO UPDATE SET enabled = EXCLUDED.enabled`,
    )
  }
}

export async function batchSetPreferences(
  userId:  string,
  prefs:   Array<{ type: NotificationType; enabled: boolean; cpId?: string }>,
): Promise<void> {
  const db = getDb()
  if (prefs.length === 0) return

  // 分别处理 CP 级和全站级偏好
  const cpPrefs    = prefs.filter((p) => p.cpId)
  const globalPrefs = prefs.filter((p) => !p.cpId)

  if (cpPrefs.length > 0) {
    await db.insert(notificationPreferences)
      .values(cpPrefs.map((p) => ({
        userId, type: p.type, enabled: p.enabled, cpId: p.cpId!,
      })))
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.cpId,
          notificationPreferences.type,
        ],
        set: { enabled: sql`excluded.enabled` },
      })
  }

  // 全站偏好逐条 upsert（避免 Drizzle 的 onConflict 不支持 partial index 问题）
  for (const p of globalPrefs) {
    await db.execute(
      sql`INSERT INTO notification_preferences (user_id, type, enabled, cp_id)
          VALUES (${userId}::uuid, ${p.type}::notification_type, ${p.enabled}, NULL)
          ON CONFLICT (user_id, type) WHERE cp_id IS NULL
          DO UPDATE SET enabled = EXCLUDED.enabled`,
    )
  }
}
