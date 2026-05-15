/**
 * milestones 表（大事记）
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core'
import { cps } from './cp.js'
import { events } from './events.js'

export const milestones = pgTable('milestones', {
  id:            uuid('id').primaryKey().defaultRandom(),
  cpId:          uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  // 可关联到时间轴事件（也可独立存在）
  eventId:       uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
  title:         varchar('title', { length: 500 }).notNull(),
  description:   text('description'),
  milestoneDate: date('milestone_date'),
  // 图标标记（emoji 字符）
  icon:          varchar('icon', { length: 50 }).default('⭐'),
  sortOrder:     integer('sort_order').notNull().default(0),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Milestone = typeof milestones.$inferSelect
export type NewMilestone = typeof milestones.$inferInsert
