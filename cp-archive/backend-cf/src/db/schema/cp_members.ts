/**
 * cp_members 表（CP 级别权限）
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users.js'
import { cps } from './cp.js'

export const cpMembers = sqliteTable('cp_members', {
  id:        text('id').primaryKey(),
  cpId:      text('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  userId:    text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  // role: cp_admin | editor | viewer
  role:      text('role').notNull().default('viewer'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type CpMember    = typeof cpMembers.$inferSelect
export type NewCpMember = typeof cpMembers.$inferInsert
