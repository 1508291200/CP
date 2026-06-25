/**
 * milestones 表
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { cps } from './cp.js'
import { events } from './events.js'

export const milestones = sqliteTable('milestones', {
  id:            text('id').primaryKey(),
  cpId:          text('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  eventId:       text('event_id').references(() => events.id, { onDelete: 'set null' }),
  title:         text('title', { length: 500 }).notNull(),
  description:   text('description'),
  milestoneDate: text('milestone_date', { length: 10 }), // YYYY-MM-DD
  icon:          text('icon', { length: 50 }).default('⭐'),
  sortOrder:     integer('sort_order').notNull().default(0),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:     integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type Milestone    = typeof milestones.$inferSelect
export type NewMilestone = typeof milestones.$inferInsert
