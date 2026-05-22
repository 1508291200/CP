/**
 * notifications 表 — 系统通知
 * notification_preferences 表 — 用户订阅偏好
 *
 * 设计原则：
 *   - 通知只写不改（已读状态除外），保持审计轨迹
 *   - preferences 默认不存记录 = 开启；有记录且 enabled=false = 关闭
 *   - cpId 为 NULL 表示全站级通知（成员管理、系统消息等）
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { cps } from './cp.js'

export const notificationTypeEnum = pgEnum('notification_type', [
  'event:created',       // CP 内有新事件发布
  'event:updated',       // 已有事件被编辑
  'event:deleted',       // 事件被删除
  'event:milestone',     // 事件被标记为里程碑
  'member:joined',       // 新成员加入（被邀请）
  'member:role_changed', // 成员权限变更
  'member:removed',      // 成员被移除
  'cp:updated',          // CP 基本信息被修改
])

export const notifications = pgTable(
  'notifications',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    // 接收者
    recipientId:  uuid('recipient_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type:         notificationTypeEnum('type').notNull(),
    // 关联 CP（NULL 表示全站级通知）
    cpId:         uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }),
    // 触发操作的用户
    actorId:      uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    // 关联实体（事件 ID / 用户 ID / CP ID 等）
    entityId:     uuid('entity_id'),
    entityType:   varchar('entity_type', { length: 50 }), // 'event' | 'user' | 'cp'
    title:        varchar('title', { length: 200 }).notNull(),
    body:         text('body'),
    isRead:       boolean('is_read').notNull().default(false),
    createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 覆盖"未读消息"和"按时间分页"查询
    index('notif_recipient_read_idx').on(t.recipientId, t.isRead, t.createdAt),
  ],
)

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId:  uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    // NULL = 全站偏好；非 NULL = 该 CP 的独立偏好（优先级高于全站）
    cpId:    uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }),
    type:    notificationTypeEnum('type').notNull(),
    enabled: boolean('enabled').notNull().default(true),
  },
  (t) => [
    // 同一用户在同一 CP（或全站）对同一通知类型只能有一条偏好记录
    unique('notif_pref_unique').on(t.userId, t.cpId, t.type),
  ],
)

export type Notification         = typeof notifications.$inferSelect
export type NewNotification      = typeof notifications.$inferInsert
export type NotificationPref     = typeof notificationPreferences.$inferSelect
export type NotificationType     = (typeof notificationTypeEnum.enumValues)[number]
