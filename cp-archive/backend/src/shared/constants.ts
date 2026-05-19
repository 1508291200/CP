/**
 * 全局常量 — 双层权限矩阵（v2，CP级权限体系）
 *
 * 权限分为两层：
 *   1. ROLE_PERMISSIONS   — 全站级，基于 users.role 判断（现有 permissionMiddleware 使用）
 *   2. CP_ROLE_PERMISSIONS — CP级，基于 cp_members.cp_role 判断（cpPermissionMiddleware 使用）
 *      owner/admin 对所有 CP 自动拥有 cp_admin 全集权限，无需 cp_members 记录
 */

import type { UserRole } from '../db/schema/users.js'

// ── 全站级权限矩阵 ────────────────────────────────────────────────────────────
// 仅涉及 owner/admin 专属操作（CP 内容操作移至 CP_ROLE_PERMISSIONS）
export const ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  // CP 管理（创建和删除是全站操作）
  'cp:create':           ['owner', 'admin'],
  'cp:delete':           ['owner', 'admin'],
  // 成员管理
  'member:manage':       ['owner', 'admin'],
  // 站点设置
  'settings:site':       ['owner'],
  'settings:theme':      ['owner', 'admin'],
  // 数据管理
  'data:export':         ['owner', 'admin'],
  'data:import':         ['owner', 'admin'],
  // 邀请码（unlimited = 全站邀请码；limited = CP 内邀请码）
  'invite:unlimited':    ['owner', 'admin'],
  'invite:limited':      ['owner', 'admin', 'cp_admin'],
  // 日志
  'log:view':            ['owner', 'admin'],
}

// ── CP 级权限矩阵 ─────────────────────────────────────────────────────────────
// 基于 cp_members.cp_role 判断（'cp_admin' | 'editor'）
// owner/admin 调用 checkCpPermission 时自动通行，不受此矩阵限制
export const CP_ROLE_PERMISSIONS: Record<string, string[]> = {
  // CP 信息编辑
  'cp:update':           ['cp_admin'],
  // 事件管理
  'event:create':        ['cp_admin', 'editor'],
  'event:edit:own':      ['cp_admin', 'editor'],
  'event:edit:others':   ['cp_admin'],
  'event:delete:own':    ['cp_admin', 'editor'],
  'event:delete:others': ['cp_admin'],
  // 人物管理
  'character:edit':      ['cp_admin', 'editor'],
  // 里程碑
  'milestone:create':    ['cp_admin', 'editor'],
  'milestone:edit':      ['cp_admin'],
  'milestone:delete':    ['cp_admin'],
  // 标签管理
  'tag:manage':          ['cp_admin'],
  // 历史版本
  'history:view:others': ['cp_admin', 'editor'],
  'history:restore':     ['cp_admin'],
  // CP 成员管理（cp_admin 可管理该 CP 内的成员）
  'cp_member:manage':    ['cp_admin'],
  // 自定义 Tab
  'custom_tab:manage':   ['cp_admin'],
}

// ── 其他常量 ──────────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_LIMIT    = 20
export const MAX_PAGE_LIMIT        = 100
export const MAX_EVENT_VERSIONS    = 50
export const CP_ADMIN_DEFAULT_QUOTA = 5   // cp_admin 默认邀请码配额
