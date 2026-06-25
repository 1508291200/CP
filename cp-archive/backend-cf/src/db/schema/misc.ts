/**
 * operation_logs 表（操作日志）
 * site_settings 表（站点配置）
 * notifications 表
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users.js'

export const operationLogs = sqliteTable('operation_logs', {
  id:           text('id').primaryKey(),
  userId:       text('user_id').references(() => users.id),
  action:       text('action', { length: 100 }).notNull(),
  resourceType: text('resource_type', { length: 50 }),
  resourceId:   text('resource_id'),
  detail:       text('detail').default('{}'), // JSON 字符串
  ip:           text('ip', { length: 45 }),   // inet → text
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const siteSettings = sqliteTable('site_settings', {
  key:       text('key', { length: 100 }).primaryKey(),
  value:     text('value').notNull(),  // JSON 字符串
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const notifications = sqliteTable('notifications', {
  id:         text('id').primaryKey(),
  userId:     text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  // type: event_created | event_updated | cp_invite | etc.
  type:       text('type', { length: 50 }).notNull(),
  title:      text('title', { length: 200 }).notNull(),
  body:       text('body'),
  payload:    text('payload').default('{}'), // JSON 字符串
  isRead:     integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type OperationLog    = typeof operationLogs.$inferSelect
export type SiteSetting     = typeof siteSettings.$inferSelect
export type Notification    = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
