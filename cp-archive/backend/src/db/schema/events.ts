/**
 * events 表 + event_versions（版本历史）+ event_relations（关联）+ event_tags
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  timestamp,
  pgEnum,
  jsonb,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { cps } from './cp.js'
import { tags } from './tags.js'

export const importanceEnum = pgEnum('importance', [
  'critical',
  'high',
  'medium',
  'normal',
  'low',
])

export const datePrecisionEnum = pgEnum('date_precision', ['year', 'month', 'day'])

export const eventVisibilityEnum = pgEnum('event_visibility', [
  'public',
  'members',
  'specified',
  'private',
])

export const events = pgTable('events', {
  id:           uuid('id').primaryKey().defaultRandom(),
  cpId:         uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  title:        varchar('title', { length: 500 }).notNull(),
  // 简短摘要（简单模式显示）
  summary:      text('summary'),
  // Block Editor JSON（富文本内容，结构不强约束，JSONB 便于扩展）
  content:      jsonb('content').$type<Record<string, unknown>>().default({}),
  eventDate:    date('event_date'),
  // 模糊日期精度（仅年/年月/精确到日）
  datePrecision: datePrecisionEnum('date_precision').notNull().default('day'),
  importance:   importanceEnum('importance').notNull().default('normal'),
  visibility:   eventVisibilityEnum('visibility').notNull().default('members'),
  // 是否已标记为里程碑
  isMilestone:  boolean('is_milestone').notNull().default(false),
  // 来源/出处（章节、链接等）
  sourceRef:    varchar('source_ref', { length: 500 }),
  // 情感倾向 emoji
  emotionIcon:  varchar('emotion_icon', { length: 50 }),
  // 事件级别的自定义扩展字段
  customFields: jsonb('custom_fields').$type<Record<string, unknown>>().default({}),
  createdBy:    uuid('created_by').references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// 事件版本历史（每次编辑前保存快照）
export const eventVersions = pgTable('event_versions', {
  id:        uuid('id').primaryKey().defaultRandom(),
  eventId:   uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  // 完整事件快照
  snapshot:  jsonb('snapshot').$type<Record<string, unknown>>().notNull(),
  editedBy:  uuid('edited_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// 事件间关联关系（前因/后续/相关等）
export const eventRelations = pgTable('event_relations', {
  id:           uuid('id').primaryKey().defaultRandom(),
  sourceId:     uuid('source_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  targetId:     uuid('target_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  relationType: varchar('relation_type', { length: 50 }).notNull().default('related'),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// 事件与标签的多对多关联
export const eventTags = pgTable(
  'event_tags',
  {
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
    tagId:   uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.tagId] })],
)

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert
export type Importance = (typeof importanceEnum.enumValues)[number]
