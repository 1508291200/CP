/**
 * characters 表（CP 下的人物）
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { cps } from './cp.js'

export const characters = sqliteTable('characters', {
  id:           text('id').primaryKey(),
  cpId:         text('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  name:         text('name', { length: 100 }).notNull(),
  aliases:      text('aliases').default('[]'), // JSON 数组
  avatarUrl:    text('avatar_url', { length: 500 }),
  roleLabel:    text('role_label', { length: 50 }),
  birthday:     text('birthday', { length: 10 }),  // YYYY-MM-DD
  bio:          text('bio'),
  customFields: text('custom_fields').default('[]'), // JSON 数组
  sortOrder:    integer('sort_order').notNull().default(0),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type Character    = typeof characters.$inferSelect
export type NewCharacter = typeof characters.$inferInsert
