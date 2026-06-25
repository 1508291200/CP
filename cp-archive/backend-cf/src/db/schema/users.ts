/**
 * users 表 + invitations 表
 *
 * 角色体系：owner > admin > cp_admin > editor > viewer
 * D1/SQLite 版本：uuid→text, timestamp→integer, boolean→integer, jsonb→text
 */
import {
  sqliteTable,
  text,
  integer,
} from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  username:     text('username', { length: 50 }).unique().notNull(),
  email:        text('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  // 枚举值：owner | admin | cp_admin | editor | viewer
  role:         text('role').notNull().default('viewer'),
  displayName:  text('display_name', { length: 100 }),
  avatarUrl:    text('avatar_url', { length: 500 }),
  // preferences JSON 字符串
  preferences:  text('preferences').default('{}'),
  isActive:     integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const invitations = sqliteTable('invitations', {
  id:        text('id').primaryKey(),
  code:      text('code', { length: 64 }).unique().notNull(),
  role:      text('role').notNull().default('editor'),
  cpId:      text('cp_id'),
  createdBy: text('created_by').references(() => users.id),
  usedBy:    text('used_by').references(() => users.id),
  maxUses:   integer('max_uses').notNull().default(1),
  useCount:  integer('use_count').notNull().default(0),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  label:     text('label', { length: 100 }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type User    = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserRole = 'owner' | 'admin' | 'cp_admin' | 'editor' | 'viewer'
