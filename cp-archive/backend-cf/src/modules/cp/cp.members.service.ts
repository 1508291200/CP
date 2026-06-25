/**
 * CP 成员管理 Service — D1 版本
 */
import { eq, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { cpMembers, users, cps } from '../../db/schema/index.js'
import type { UserRole } from '../../db/schema/users.js'
import { ForbiddenError, NotFoundError, ConflictError, ValidationError } from '../../shared/errors.js'
import { newId } from '../../utils/id.js'
import type { Env } from '../../types/env.js'

type CpMemberRole = 'cp_admin' | 'editor' | 'viewer'

export async function listCpMembers(cpId: string, env: Env) {
  const db = getDb(env.DB)
  const [cp] = await db.select({ id: cps.id }).from(cps).where(eq(cps.id, cpId))
  if (!cp) throw new NotFoundError('CP', cpId)

  return db
    .select({
      memberId:    cpMembers.id,
      cpRole:      cpMembers.role,
      createdAt:   cpMembers.createdAt,
      userId:      users.id,
      username:    users.username,
      displayName: users.displayName,
      avatarUrl:   users.avatarUrl,
      globalRole:  users.role,
    })
    .from(cpMembers)
    .innerJoin(users, eq(cpMembers.userId, users.id))
    .where(eq(cpMembers.cpId, cpId))
}

export async function addCpMember(
  cpId:      string,
  userId:    string,
  cpRole:    CpMemberRole,
  env:       Env,
) {
  const db = getDb(env.DB)

  const [targetUser] = await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.id, userId))
  if (!targetUser) throw new NotFoundError('用户', userId)
  if (!targetUser.isActive) throw new ValidationError('用户已被停用')

  const [existing] = await db
    .select({ id: cpMembers.id })
    .from(cpMembers)
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
  if (existing) throw new ConflictError('该用户已是此 CP 的成员')

  const id = newId()
  await db.insert(cpMembers).values({ id, cpId, userId, role: cpRole, createdAt: new Date() })

  const [member] = await db.select().from(cpMembers).where(eq(cpMembers.id, id))
  return member!
}

export async function updateCpMemberRole(
  cpId:               string,
  userId:             string,
  newRole:            CpMemberRole,
  operatorGlobalRole: UserRole,
  env:                Env,
) {
  const db = getDb(env.DB)

  const [member] = await db
    .select()
    .from(cpMembers)
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
  if (!member) throw new NotFoundError('CP成员', userId)

  if (operatorGlobalRole !== 'owner' && operatorGlobalRole !== 'admin') {
    if (newRole === 'cp_admin') throw new ForbiddenError('只有 owner/admin 才能授予 cp_admin 角色')
    if (member.role === 'cp_admin') throw new ForbiddenError('无权修改此成员的角色')
  }

  await db.update(cpMembers).set({ role: newRole }).where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))

  const [updated] = await db.select().from(cpMembers).where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
  return updated!
}

export async function removeCpMember(
  cpId:               string,
  userId:             string,
  operatorGlobalRole: UserRole,
  env:                Env,
) {
  const db = getDb(env.DB)

  const [member] = await db
    .select()
    .from(cpMembers)
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
  if (!member) throw new NotFoundError('CP成员', userId)

  if (operatorGlobalRole !== 'owner' && operatorGlobalRole !== 'admin') {
    if (member.role === 'cp_admin') throw new ForbiddenError('无权移除 cp_admin 级别的成员')
  }

  await db.delete(cpMembers).where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
}
