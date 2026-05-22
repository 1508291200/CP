/**
 * CP 成员管理 Service
 *
 * 职责：管理 cp_members 表（CP 内的成员角色关系）
 * 不涉及全站角色，只操作 cp_members / cp_admin_quota
 *
 * 权限规则（调用方负责检查）：
 *   - owner/admin 可执行所有操作
 *   - cp_admin 可管理其担任 cp_admin 的 CP 的成员
 *     - 只能授予 editor 角色（不能授予 cp_admin，除非 owner/admin）
 *     - 只能移除权重低于自身的成员
 */

import { eq, and } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { cpMembers, users, cps } from '../../db/schema/index.js'
import type { UserRole } from '../../db/schema/users.js'
import type { CpMemberRole } from '../../db/schema/cp_members.js'
import { ForbiddenError, NotFoundError, ConflictError, ValidationError } from '../../shared/errors.js'
import { logOperation } from '../user/user.log.js'
import { emitNotification } from '../../shared/notification.emitter.js'

// 角色权重（cp_admin > editor）
const CP_ROLE_WEIGHT: Record<CpMemberRole, number> = {
  cp_admin: 2,
  editor:   1,
}

/**
 * 列出某 CP 的所有成员（含用户基本信息）
 */
export async function listCpMembers(cpId: string) {
  const db = getDb()

  // 验证 CP 存在
  const [cp] = await db.select({ id: cps.id, name: cps.name }).from(cps).where(eq(cps.id, cpId))
  if (!cp) throw new NotFoundError('CP', cpId)

  const rows = await db
    .select({
      memberId:    cpMembers.id,
      cpRole:      cpMembers.cpRole,
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

  return rows
}

/**
 * 添加成员到 CP
 * - owner/admin 才能执行（更广泛的分配），权限在路由层校验
 * - cpRole 为 'cp_admin' 时，同时初始化配额记录
 */
export async function addCpMember(
  cpId:      string,
  userId:    string,
  cpRole:    CpMemberRole,
  grantedBy: string,
) {
  const db = getDb()

  // 确认目标用户存在且处于活跃状态
  const [targetUser] = await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.id, userId))
  if (!targetUser) throw new NotFoundError('User', userId)
  if (!targetUser.isActive) throw new ValidationError('用户已被停用')

  // 检查是否已是该 CP 成员
  const [existing] = await db
    .select({ id: cpMembers.id })
    .from(cpMembers)
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
  if (existing) throw new ConflictError('该用户已是此 CP 的成员')

  const [member] = await db.insert(cpMembers).values({
    cpId, userId, cpRole, grantedBy,
  }).returning()

  await logOperation(grantedBy, 'cp_member:add', 'cp_member', member.id, { cpId, cpRole })

  // 发布新成员加入通知
  emitNotification({
    type:       'member:joined',
    cpId,
    actorId:    grantedBy,
    entityId:   userId,
    entityType: 'user',
    title:      '新成员加入',
    body:       `有新成员以 ${cpRole} 身份加入了 CP`,
  })

  return member
}

/**
 * 修改 CP 内成员角色
 * - cp_admin 只能将成员设置为 editor（不能晋升为 cp_admin，那需要 owner/admin）
 * - owner/admin 可设置任意角色
 */
export async function updateCpMemberRole(
  cpId:          string,
  userId:        string,
  newRole:       CpMemberRole,
  operatorId:    string,
  operatorGlobalRole: UserRole,
) {
  const db = getDb()

  const [member] = await db
    .select()
    .from(cpMembers)
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
  if (!member) throw new NotFoundError('CpMember', userId)

  // cp_admin 不能晋升其他人为 cp_admin（防止越权）
  if (operatorGlobalRole !== 'owner' && operatorGlobalRole !== 'admin') {
    if (newRole === 'cp_admin') {
      throw new ForbiddenError('只有 owner/admin 才能授予 cp_admin 角色')
    }
    // cp_admin 不能修改同级别成员
    if (member.cpRole === 'cp_admin') {
      throw new ForbiddenError('无权修改此成员的角色')
    }
  }

  const [updated] = await db
    .update(cpMembers)
    .set({ cpRole: newRole })
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
    .returning()

  await logOperation(operatorId, 'cp_member:role_change', 'cp_member', member.id, {
    cpId, oldRole: member.cpRole, newRole,
  })

  // 发布权限变更通知（接收者为被改角色的用户）
  emitNotification({
    type:       'member:role_changed',
    cpId,
    actorId:    operatorId,
    entityId:   userId,
    entityType: 'user',
    title:      '您的 CP 权限已变更',
    body:       `您的角色已被修改为 ${newRole}`,
  })

  return updated
}

/**
 * 从 CP 移除成员
 * - cp_admin 只能移除 editor（不能移除同级 cp_admin）
 * - owner/admin 可移除任意成员
 */
export async function removeCpMember(
  cpId:               string,
  userId:             string,
  operatorId:         string,
  operatorGlobalRole: UserRole,
) {
  const db = getDb()

  const [member] = await db
    .select()
    .from(cpMembers)
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
  if (!member) throw new NotFoundError('CpMember', userId)

  // cp_admin 不能移除同级别成员
  if (operatorGlobalRole !== 'owner' && operatorGlobalRole !== 'admin') {
    if (member.cpRole === 'cp_admin') {
      throw new ForbiddenError('无权移除 cp_admin 级别的成员')
    }
  }

  await db.delete(cpMembers).where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))
  await logOperation(operatorId, 'cp_member:remove', 'cp_member', member.id, { cpId, userId })

  // 发布成员被移除通知（接收者为被移除的用户）
  emitNotification({
    type:       'member:removed',
    cpId,
    actorId:    operatorId,
    entityId:   userId,
    entityType: 'user',
    title:      '您已被移出 CP',
    body:       `您已被移出该 CP，如有疑问请联系管理员`,
  })
}
