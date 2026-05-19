/**
 * cp_members 表 — CP 成员关系（CP 级权限）
 * cp_admin_quota 表 — cp_admin 邀请码配额
 *
 * 说明：
 *   - owner / admin 的 CP 权限全局通行，无需此表记录
 *   - cp_admin 和 editor 必须通过此表声明对哪些 CP 有操作权
 *   - 同一用户在不同 CP 可拥有不同角色
 */

import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  integer,
  unique,
} from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { cps } from './cp.js'

// CP 内的角色（users.role 的子集）
export const cpMemberRoleEnum = pgEnum('cp_member_role', ['cp_admin', 'editor'])

export const cpMembers = pgTable(
  'cp_members',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    cpId:      uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
    userId:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    cpRole:    cpMemberRoleEnum('cp_role').notNull(),
    grantedBy: uuid('granted_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.cpId, t.userId)],
)

/**
 * cp_admin 邀请码配额
 * 每个 cp_admin 在每个 CP 拥有独立的配额记录
 * owner/admin 可通过 PATCH /users/:id/quota 调整上限
 */
export const cpAdminQuota = pgTable('cp_admin_quota', {
  userId:      uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  cpId:        uuid('cp_id').references(() => cps.id, { onDelete: 'cascade' }).notNull(),
  inviteQuota: integer('invite_quota').notNull().default(5),
  inviteUsed:  integer('invite_used').notNull().default(0),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type CpMember     = typeof cpMembers.$inferSelect
export type NewCpMember  = typeof cpMembers.$inferInsert
export type CpMemberRole = (typeof cpMemberRoleEnum.enumValues)[number]
export type CpAdminQuota = typeof cpAdminQuota.$inferSelect
