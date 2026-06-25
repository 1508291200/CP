/**
 * cps 表 + cp_tags 关联表 + cp_tabs 扩展 Tab 表
 * D1 版本：枚举→text, jsonb→text, timestamp→integer
 */
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from 'drizzle-orm/sqlite-core'
import { users } from './users.js'
import { tags } from './tags.js'

export const cps = sqliteTable('cps', {
  id:           text('id').primaryKey(),
  name:         text('name', { length: 200 }).notNull(),
  subtitle:     text('subtitle', { length: 200 }),
  description:  text('description'),
  coverUrl:     text('cover_url', { length: 500 }),
  bannerUrl:    text('banner_url', { length: 500 }),
  // status: active | archived | completed
  status:       text('status').notNull().default('active'),
  // visibility: public | members | private
  visibility:   text('visibility').notNull().default('private'),
  // JSON 字符串
  themeConfig:  text('theme_config').default('{}'),
  customFields: text('custom_fields').default('[]'),
  sortOrder:    integer('sort_order').notNull().default(0),
  createdBy:    text('created_by').references(() => users.id),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:    integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const cpTags = sqliteTable(
  'cp_tags',
  {
    cpId:  text('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
    tagId: text('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.cpId, t.tagId] })],
)

export const cpTabs = sqliteTable('cp_tabs', {
  id:        text('id').primaryKey(),
  cpId:      text('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  name:      text('name', { length: 100 }).notNull(),
  // tabType: profile | timeline | milestone | custom
  tabType:   text('tab_type').notNull(),
  content:   text('content').default('{}'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type Cp      = typeof cps.$inferSelect
export type NewCp   = typeof cps.$inferInsert
export type CpStatus    = 'active' | 'archived' | 'completed'
export type Visibility  = 'public' | 'members' | 'private'
