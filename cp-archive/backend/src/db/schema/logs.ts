/**
 * operation_logs 表（操作审计日志）+ site_settings 表（站点设置）
 */

import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  inet,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const operationLogs = pgTable('operation_logs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').references(() => users.id),
  // 操作类型（event:create / cp:delete / user:role_change 等）
  action:       varchar('action', { length: 100 }).notNull(),
  // 资源类型（event / cp / user 等）
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId:   uuid('resource_id'),
  // 操作详情（旧值/新值等）
  detail:       jsonb('detail').$type<Record<string, unknown>>().default({}),
  ip:           inet('ip'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// key-value 形式的站点配置
export const siteSettings = pgTable('site_settings', {
  key:       varchar('key', { length: 100 }).primaryKey(),
  value:     jsonb('value').$type<unknown>().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type OperationLog = typeof operationLogs.$inferSelect
export type SiteSetting = typeof siteSettings.$inferSelect
