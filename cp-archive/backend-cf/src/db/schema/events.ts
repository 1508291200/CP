/**
 * events 表 + event_versions + event_relations + event_tags
 */
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core'
import { users } from './users.js'
import { cps } from './cp.js'
import { tags } from './tags.js'

export const events = sqliteTable('events', {
  id:            text('id').primaryKey(),
  cpId:          text('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  title:         text('title', { length: 500 }).notNull(),
  summary:       text('summary'),
  content:       text('content').default('{}'),  // Block Editor JSON 字符串
  eventDate:     text('event_date', { length: 10 }),  // YYYY-MM-DD
  // datePrecision: year | month | day
  datePrecision: text('date_precision').notNull().default('day'),
  // importance: critical | high | medium | normal | low
  importance:    text('importance').notNull().default('normal'),
  // visibility: public | members | specified | private
  visibility:    text('visibility').notNull().default('members'),
  isMilestone:   integer('is_milestone', { mode: 'boolean' }).notNull().default(false),
  sourceRef:     text('source_ref', { length: 500 }),
  emotionIcon:   text('emotion_icon', { length: 50 }),
  customFields:  text('custom_fields').default('{}'), // JSON 字符串
  createdBy:     text('created_by').references(() => users.id),
  createdAt:     integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:     integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const eventVersions = sqliteTable('event_versions', {
  id:        text('id').primaryKey(),
  eventId:   text('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  snapshot:  text('snapshot').notNull(), // JSON 快照字符串
  editedBy:  text('edited_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const eventRelations = sqliteTable('event_relations', {
  id:           text('id').primaryKey(),
  sourceId:     text('source_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  targetId:     text('target_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  relationType: text('relation_type', { length: 50 }).notNull().default('related'),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const eventTags = sqliteTable(
  'event_tags',
  {
    eventId: text('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
    tagId:   text('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.tagId] })],
)

export type Event    = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Importance    = 'critical' | 'high' | 'medium' | 'normal' | 'low'
export type DatePrecision = 'year' | 'month' | 'day'
