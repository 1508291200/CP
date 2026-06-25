/**
 * tags 表
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users.js'

export const tags = sqliteTable('tags', {
  id:        text('id').primaryKey(),
  name:      text('name', { length: 100 }).notNull(),
  color:     text('color', { length: 20 }).notNull().default('#7B5EA7'),
  category:  text('category', { length: 50 }),
  createdBy: text('created_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type Tag    = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
