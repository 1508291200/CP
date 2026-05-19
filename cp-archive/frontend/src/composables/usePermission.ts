/**
 * 权限相关 composable（v2，CP 级权限体系）
 *
 * 两层权限：
 *   1. can(action)         — 全站级，基于 users.role（owner/admin 专属操作）
 *   2. canInCp(cpId, action) — CP 级，基于 cp_members.cp_role（内容操作）
 *      owner/admin 对所有 CP 自动通行
 *
 * 前端权限仅控制 UI 显示，真正的权限验证在后端。
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { AuthUser } from '@/api/auth'

type GlobalRole = AuthUser['role']
type CpMemberRole = 'cp_admin' | 'editor'

// ── 全站级权限矩阵（与后端 shared/constants.ts ROLE_PERMISSIONS 保持一致）───
const GLOBAL_ROLE_PERMISSIONS: Record<string, GlobalRole[]> = {
  'cp:create':        ['owner', 'admin'],
  'cp:delete':        ['owner', 'admin'],
  'member:manage':    ['owner', 'admin'],
  'settings:site':    ['owner'],
  'settings:theme':   ['owner', 'admin'],
  'data:export':      ['owner', 'admin'],
  'data:import':      ['owner', 'admin'],
  'invite:unlimited': ['owner', 'admin'],
  'invite:limited':   ['owner', 'admin', 'cp_admin'],
  'log:view':         ['owner', 'admin'],
}

// ── CP 级权限矩阵（与后端 shared/constants.ts CP_ROLE_PERMISSIONS 保持一致）─
const CP_ROLE_PERMISSIONS: Record<string, CpMemberRole[]> = {
  'cp:update':           ['cp_admin'],
  'event:create':        ['cp_admin', 'editor'],
  'event:edit:own':      ['cp_admin', 'editor'],
  'event:edit:others':   ['cp_admin'],
  'event:delete:own':    ['cp_admin', 'editor'],
  'event:delete:others': ['cp_admin'],
  'character:edit':      ['cp_admin', 'editor'],
  'milestone:create':    ['cp_admin', 'editor'],
  'milestone:edit':      ['cp_admin'],
  'milestone:delete':    ['cp_admin'],
  'tag:manage':          ['cp_admin'],
  'history:view:others': ['cp_admin', 'editor'],
  'history:restore':     ['cp_admin'],
  'cp_member:manage':    ['cp_admin'],
  'custom_tab:manage':   ['cp_admin'],
}

export function usePermission() {
  const authStore = useAuthStore()

  /**
   * 全站级权限检查（用于 owner/admin 专属功能的 UI 显示）
   */
  function can(action: string): boolean {
    const role = authStore.role
    if (!role) return false
    return GLOBAL_ROLE_PERMISSIONS[action]?.includes(role) ?? false
  }

  /**
   * CP 级权限检查（用于内容操作的 UI 显示）
   * - owner/admin 对所有 CP 自动通行（相当于 cp_admin 全集权限）
   * - 其他角色根据 cpMemberships 判断
   */
  function canInCp(cpId: string, action: string): boolean {
    const role = authStore.role
    if (!role) return false

    // owner/admin 自动通行（拥有 cp_admin 全集权限）
    if (role === 'owner' || role === 'admin') {
      return CP_ROLE_PERMISSIONS[action]?.includes('cp_admin') ?? false
    }

    // 查找用户在该 CP 的角色
    const membership = authStore.cpMemberships.find(m => m.cpId === cpId)
    if (!membership) return false

    return CP_ROLE_PERMISSIONS[action]?.includes(membership.cpRole as CpMemberRole) ?? false
  }

  // 辅助计算属性
  function canComputed(action: string) {
    return computed(() => can(action))
  }

  function canInCpComputed(cpId: string, action: string) {
    return computed(() => canInCp(cpId, action))
  }

  const isOwner   = computed(() => authStore.role === 'owner')
  const isAdmin   = computed(() => ['owner', 'admin'].includes(authStore.role ?? ''))
  // canEdit = owner/admin，或对当前 CP 有 cp_admin/editor 权限（由 canInCp 判断）
  const isStaff   = computed(() => ['owner', 'admin', 'cp_admin', 'editor'].includes(authStore.role ?? ''))

  /**
   * 获取用户在某 CP 的角色（用于显示）
   * owner/admin 返回 'owner_admin'
   */
  function getCpRole(cpId: string): 'owner_admin' | 'cp_admin' | 'editor' | null {
    const role = authStore.role
    if (!role) return null
    if (role === 'owner' || role === 'admin') return 'owner_admin'
    const membership = authStore.cpMemberships.find(m => m.cpId === cpId)
    return (membership?.cpRole as 'cp_admin' | 'editor') ?? null
  }

  return {
    can,
    canInCp,
    canComputed,
    canInCpComputed,
    isOwner,
    isAdmin,
    isStaff,
    getCpRole,
  }
}
