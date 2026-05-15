/**
 * cps 表 + cp_tags 关联表 + cp_tabs 扩展 Tab 表
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  jsonb,
  integer,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { tags } from './tags.js'

export const cpStatusEnum = pgEnum('cp_status', ['active', 'archived', 'completed'])
export const visibilityEnum = pgEnum('visibility', ['public', 'members', 'private'])
export const tabTypeEnum = pgEnum('tab_type', ['profile', 'timeline', 'milestone', 'custom'])

export const cps = pgTable('cps', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         varchar('name', { length: 200 }).notNull(),
  // "A × B" 格式的副标题
  subtitle:     varchar('subtitle', { length: 200 }),
  description:  text('description'),
  coverUrl:     varchar('cover_url', { length: 500 }),
  bannerUrl:    varchar('banner_url', { length: 500 }),
  status:       cpStatusEnum('status').notNull().default('active'),
  visibility:   visibilityEnum('visibility').notNull().default('private'),
  // CP 级主题配置（颜色、字体等 CSS token）
  themeConfig:  jsonb('theme_config').$type<Record<string, unknown>>().default({}),
  // 人物自定义字段模板定义
  customFields: jsonb('custom_fields').$type<unknown[]>().default([]),
  sortOrder:    integer('sort_order').notNull().default(0),
  createdBy:    uuid('created_by').references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// CP 与标签的多对多关联
export const cpTags = pgTable(
  'cp_tags',
  {
    cpId:  uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
    tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.cpId, t.tagId] })],
)

// CP 下的自定义 Tab（用于扩展功能）
export const cpTabs = pgTable('cp_tabs', {
  id:        uuid('id').primaryKey().defaultRandom(),
  cpId:      uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  name:      varchar('name', { length: 100 }).notNull(),
  tabType:   tabTypeEnum('tab_type').notNull(),
  // 自定义 Tab 的内容（renderer + data）
  content:   jsonb('content').$type<Record<string, unknown>>().default({}),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: boolean('is_visible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Cp = typeof cps.$inferSelect
export type NewCp = typeof cps.$inferInsert
export type CpStatus = (typeof cpStatusEnum.enumValues)[number]
export type Visibility = (typeof visibilityEnum.enumValues)[number]
