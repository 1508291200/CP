/**
 * media 表（媒体文件）+ event_media（事件与媒体关联）
 */

import {
  pgTable,
  uuid,
  varchar,
  bigint,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { events } from './events.js'

export const fileTypeEnum = pgEnum('file_type', ['image', 'video', 'file'])

export const media = pgTable('media', {
  id:           uuid('id').primaryKey().defaultRandom(),
  originalName: varchar('original_name', { length: 255 }),
  filePath:     varchar('file_path', { length: 500 }).notNull(),
  thumbPath:    varchar('thumb_path', { length: 500 }),
  fileType:     fileTypeEnum('file_type').notNull().default('image'),
  mimeType:     varchar('mime_type', { length: 100 }),
  // 字节数
  fileSize:     bigint('file_size', { mode: 'number' }),
  width:        integer('width'),
  height:       integer('height'),
  uploadedBy:   uuid('uploaded_by').references(() => users.id),
  createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const eventMedia = pgTable('event_media', {
  id:        uuid('id').primaryKey().defaultRandom(),
  eventId:   uuid('event_id').references(() => events.id, { onDelete: 'cascade' }).notNull(),
  mediaId:   uuid('media_id').references(() => media.id),
  sortOrder: integer('sort_order').notNull().default(0),
})

export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
