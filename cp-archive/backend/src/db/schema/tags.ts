/**
 * tags 表
 */

import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const tags = pgTable('tags', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      varchar('name', { length: 100 }).notNull(),
  color:     varchar('color', { length: 20 }).notNull().default('#7B5EA7'),
  // 用于分组（genre/custom 等）
  category:  varchar('category', { length: 50 }),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
