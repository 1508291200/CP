/**
 * users 表 + invitations 表
 *
 * 角色体系（v2）：
 *   owner > admin > cp_admin > editor > viewer
 *
 * cp_admin / editor 的 CP 级别权限通过 cp_members 表管理，
 * users.role 只表示全站基础角色。
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
  integer,
} from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', [
  'owner',
  'admin',
  'cp_admin',
  'editor',
  'viewer',
])

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  username:     varchar('username', { length: 50 }).unique().notNull(),
  email:        varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role:         userRoleEnum('role').notNull().default('viewer'),
  displayName:  varchar('display_name', { length: 100 }),
  avatarUrl:    varchar('avatar_url', { length: 500 }),
  // 个人偏好 JSON（编辑器模式、时间格式、通知开关等）
  preferences:  jsonb('preferences').$type<Record<string, unknown>>().default({}),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const invitations = pgTable('invitations', {
  id:        uuid('id').primaryKey().defaultRandom(),
  code:      varchar('code', { length: 64 }).unique().notNull(),
  role:      userRoleEnum('role').notNull().default('editor'),
  // NULL = 全站邀请（owner/admin 生成）；非 NULL = 绑定特定 CP（cp_admin 生成）
  cpId:      uuid('cp_id'),
  createdBy: uuid('created_by').references(() => users.id),
  usedBy:    uuid('used_by').references(() => users.id),  // max_uses=1 时记录首位使用者
  // 多次使用支持（cp_admin 可生成 max_uses=1 的一次性码）
  maxUses:   integer('max_uses').notNull().default(1),
  useCount:  integer('use_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  label:     varchar('label', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User    = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserRole = (typeof userRoleEnum.enumValues)[number]
