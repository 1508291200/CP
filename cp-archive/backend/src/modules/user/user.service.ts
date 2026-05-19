/**
 * 用户管理 Service
 * 职责：用户列表、角色修改、停用账号、邀请码生成/撤销
 * 不涉及 HTTP 上下文，只操作数据库
 */
import { eq, and, isNull, ilike, or, count } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { getDb } from '../../db/connection.js'
import { users, invitations } from '../../db/schema/index.js'
import type { UserRole } from '../../db/schema/users.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors.js'
import { logOperation } from './user.log.js'
import type {
  UpdateMyProfileInput,
  UpdateUserRoleInput,
  GenerateInviteInput,
  ListUsersInput,
} from './user.schema.js'

// 角色权重：数值越大权限越高
const ROLE_WEIGHT: Record<UserRole, number> = {
  owner: 100, admin: 80, editor: 60, contributor: 40, viewer: 20,
}

function canOperate(operatorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_WEIGHT[operatorRole] > ROLE_WEIGHT[targetRole]
}

function buildUserPublic(user: typeof users.$inferSelect) {
  const { passwordHash: _, ...pub } = user
  return pub
}

// ── 列表 ──────────────────────────────────────────────────────────
export async function listUsers(query: ListUsersInput) {
  const db = getDb()
  const { page, limit, role, keyword } = query
  const offset = (page - 1) * limit

  const conditions = []
  if (role) conditions.push(eq(users.role, role))
  if (keyword) {
    conditions.push(or(
      ilike(users.username, `%${keyword}%`),
      ilike(users.displayName ?? users.username, `%${keyword}%`),
    ))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(users).where(where).limit(limit).offset(offset).orderBy(users.createdAt),
    db.select({ total: count() }).from(users).where(where),
  ])

  return {
    items: rows.map(buildUserPublic),
    meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) },
  }
}

// ── 个人资料 ──────────────────────────────────────────────────────
export async function getMe(userId: string) {
  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (!user) throw new NotFoundError('User', userId)
  return buildUserPublic(user)
}

export async function updateMe(userId: string, data: UpdateMyProfileInput) {
  const db = getDb()
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning()
  if (!user) throw new NotFoundError('User', userId)
  return buildUserPublic(user)
}

// ── 角色修改 ─────────────────────────────────────────────────────
export async function updateUserRole(
  targetId: string,
  data: UpdateUserRoleInput,
  operatorId: string,
  operatorRole: UserRole,
) {
  const db = getDb()
  const [target] = await db.select().from(users).where(eq(users.id, targetId))
  if (!target) throw new NotFoundError('User', targetId)
  if (target.id === operatorId) throw new ForbiddenError('不能修改自己的角色')
  if (!canOperate(operatorRole, target.role)) throw new ForbiddenError('无权操作该用户')
  if (!canOperate(operatorRole, data.role as UserRole)) throw new ForbiddenError('无权授予该角色')

  const [updated] = await db
    .update(users)
    .set({ role: data.role as UserRole, updatedAt: new Date() })
    .where(eq(users.id, targetId))
    .returning()

  await logOperation(operatorId, 'user:role_change', 'user', targetId, {
    oldRole: target.role, newRole: data.role,
  })

  return buildUserPublic(updated)
}

// ── 停用账号 ─────────────────────────────────────────────────────
export async function deactivateUser(targetId: string, operatorId: string, operatorRole: UserRole) {
  const db = getDb()
  const [target] = await db.select().from(users).where(eq(users.id, targetId))
  if (!target) throw new NotFoundError('User', targetId)
  if (target.id === operatorId) throw new ForbiddenError('不能停用自己的账号')
  if (!canOperate(operatorRole, target.role)) throw new ForbiddenError('无权操作该用户')

  await db.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, targetId))
  await logOperation(operatorId, 'user:deactivate', 'user', targetId, { username: target.username })
}

// ── 邀请码 ───────────────────────────────────────────────────────
export async function generateInviteCode(data: GenerateInviteInput, createdBy: string) {
  const db = getDb()
  const code = randomBytes(24).toString('hex') // 48 字符随机码

  let expiresAt: Date | null = null
  if (data.expiresIn === '24h') {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  } else if (data.expiresIn === '7d') {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }

  const [invite] = await db.insert(invitations).values({
    code,
    role: data.role,
    createdBy,
    expiresAt: expiresAt ?? undefined,
  }).returning()

  await logOperation(createdBy, 'user:invite', 'invitation', invite.id, { role: data.role, expiresIn: data.expiresIn })
  return invite
}

export async function listInvitations(createdBy?: string) {
  const db = getDb()
  const rows = await db
    .select()
    .from(invitations)
    .where(createdBy ? eq(invitations.createdBy, createdBy) : undefined)
    .orderBy(invitations.createdAt)
  return rows
}

export async function revokeInvitation(code: string, operatorId: string, operatorRole: UserRole) {
  const db = getDb()
  const [invite] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.code, code), isNull(invitations.usedBy)))

  if (!invite) throw new NotFoundError('Invitation', code)

  // admin+ 可撤销任意邀请码；普通用户只能撤销自己创建的
  if (operatorRole !== 'owner' && operatorRole !== 'admin' && invite.createdBy !== operatorId) {
    throw new ForbiddenError('无权撤销此邀请码')
  }

  await db.delete(invitations).where(eq(invitations.code, code))
}

// ── 操作日志查询 ─────────────────────────────────────────────────
export async function listLogs(query: { page?: number; limit?: number }) {
  const { page = 1, limit = 50 } = query
  const { operationLogs } = await import('../../db/schema/index.js')
  const db = getDb()
  const rows = await db
    .select()
    .from(operationLogs)
    .orderBy(operationLogs.createdAt)
    .limit(limit)
    .offset((page - 1) * limit)
  return rows
}
