/**
 * 全局常量
 * - 权限矩阵（前后端共享逻辑的后端版本）
 * - 分页默认值
 */

import type { UserRole } from '../db/schema/users.js'

// 权限矩阵：操作 → 允许的角色列表
export const ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  'cp:create':             ['owner', 'admin', 'editor'],
  'cp:update':             ['owner', 'admin', 'editor'],
  'cp:delete':             ['owner', 'admin'],
  'event:create':          ['owner', 'admin', 'editor', 'contributor'],
  'event:edit:own':        ['owner', 'admin', 'editor', 'contributor'],
  'event:edit:others':     ['owner', 'admin', 'editor'],
  'event:delete:own':      ['owner', 'admin', 'editor', 'contributor'],
  'event:delete:others':   ['owner', 'admin'],
  'milestone:create':      ['owner', 'admin', 'editor', 'contributor'],
  'milestone:edit':        ['owner', 'admin', 'editor'],
  'milestone:delete':      ['owner', 'admin', 'editor'],
  'character:edit':        ['owner', 'admin', 'editor'],
  'tag:manage':            ['owner', 'admin', 'editor'],
  'member:manage':         ['owner', 'admin'],
  'settings:theme':        ['owner', 'admin'],
  'settings:site':         ['owner'],
  'data:export':           ['owner', 'admin'],
  'data:import':           ['owner', 'admin'],
  'history:view:others':   ['owner', 'admin', 'editor'],
  'history:restore':       ['owner', 'admin', 'editor'],
  'custom_html:use':       ['owner', 'admin'],
  'log:view':              ['owner', 'admin'],
}

export const DEFAULT_PAGE_LIMIT = 20
export const MAX_PAGE_LIMIT = 100
export const MAX_EVENT_VERSIONS = 50
