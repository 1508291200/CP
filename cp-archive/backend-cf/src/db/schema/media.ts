/**
 * media 表 + event_media 关联表
 * 无缩略图字段（全 CF 方案放弃缩略图）
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users.js'
import { events } from './events.js'

export const media = sqliteTable('media', {
  id:           text('id').primaryKey(),
  originalName: text('original_name', { length: 255 }),
  // R2 object key，如 "media/2024/01/{uuid}.jpg"
  r2Key:        text('r2_key', { length: 500 }).notNull(),
  // file_type: image | video | file
  fileType:     text('file_type').notNull().default('image'),
  mimeType:     text('mime_type', { length: 100 }),
  fileSize:     integer('file_size'),
  width:        integer('width'),
  height:       integer('height'),
  uploadedBy:   text('uploaded_by').references(() => users.id),
  createdAt:    integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const eventMedia = sqliteTable('event_media', {
  id:        text('id').primaryKey(),
  eventId:   text('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  mediaId:   text('media_id').references(() => media.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
})

export type Media    = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
