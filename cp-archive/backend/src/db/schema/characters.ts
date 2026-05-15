/**
 * characters 表（CP 下的人物档案）
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core'
import { cps } from './cp.js'

export const characters = pgTable('characters', {
  id:           uuid('id').primaryKey().defaultRandom(),
  cpId:         uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  name:         varchar('name', { length: 100 }).notNull(),
  // 多个别名/昵称数组
  aliases:      jsonb('aliases').$type<string[]>().default([]),
  avatarUrl:    varchar('avatar_url', { length: 500 }),
  // 主角/配角等标注
  roleLabel:    varchar('role_label', { length: 50 }),
  birthday:     date('birthday'),
  bio:          text('bio'),
  // 用户自定义键值对字段 [{key, label, type, value}]
  customFields: jsonb('custom_fields').$type<unknown[]>().default([]),
  sortOrder:    integer('sort_order').notNull().default(0),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Character = typeof characters.$inferSelect
export type NewCharacter = typeof characters.$inferInsert
