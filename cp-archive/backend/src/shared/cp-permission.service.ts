/**
 * CP 级权限检查服务
 *
 * 双层检查逻辑：
 *   1. owner / admin → 自动拥有所有 CP 的 cp_admin 权限，直接通行
 *   2. 其他角色     → 查 cp_members 表获取该用户在该 CP 的角色
 *                     再查 CP_ROLE_PERMISSIONS 矩阵判断
 *
 * 这个服务是纯函数（不带 HTTP 上下文），可被中间件和 Service 层复用。
 */

import { eq, and } from 'drizzle-orm'
import { getDb } from '../db/connection.js'
import { cpMembers } from '../db/schema/index.js'
import { CP_ROLE_PERMISSIONS } from './constants.js'
import type { UserRole } from '../db/schema/users.js'

/**
 * 检查用户是否对某 CP 拥有指定操作权限
 *
 * @param userId      当前用户 ID
 * @param globalRole  用户的全站角色
 * @param cpId        目标 CP 的 ID
 * @param action      操作名称（对应 CP_ROLE_PERMISSIONS 的 key）
 * @returns           true = 有权限，false = 无权限
 */
export async function checkCpPermission(
  userId: string,
  globalRole: UserRole,
  cpId: string,
  action: string,
): Promise<boolean> {
  // owner/admin 对所有 CP 自动拥有完整权限
  if (globalRole === 'owner' || globalRole === 'admin') {
    // owner/admin 拥有 cp_admin 的所有权限
    return CP_ROLE_PERMISSIONS[action]?.includes('cp_admin') ?? false
  }

  // 其他角色：查询 cp_members 表
  const db = getDb()
  const [membership] = await db
    .select({ cpRole: cpMembers.cpRole })
    .from(cpMembers)
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))

  if (!membership) return false

  return CP_ROLE_PERMISSIONS[action]?.includes(membership.cpRole) ?? false
}

/**
 * 获取用户在某 CP 的角色（用于 UI 展示）
 * 返回 null 表示该用户不是该 CP 成员（viewer）
 */
export async function getCpRole(
  userId: string,
  globalRole: UserRole,
  cpId: string,
): Promise<'cp_admin' | 'editor' | 'owner_admin' | null> {
  if (globalRole === 'owner' || globalRole === 'admin') {
    return 'owner_admin'
  }

  const db = getDb()
  const [membership] = await db
    .select({ cpRole: cpMembers.cpRole })
    .from(cpMembers)
    .where(and(eq(cpMembers.cpId, cpId), eq(cpMembers.userId, userId)))

  return membership?.cpRole ?? null
}
