/**
 * 权限相关 composable
 * 前端权限仅控制 UI 显示，真正的权限验证在后端
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { AuthUser } from '@/api/auth'

type Role = AuthUser['role']

// 权限矩阵（与后端 shared/constants.ts 保持一致）
const ROLE_PERMISSIONS: Record<string, Role[]> = {
  'cp:create':              ['owner', 'admin', 'editor'],
  'cp:delete':              ['owner', 'admin'],
  'event:create':           ['owner', 'admin', 'editor', 'contributor'],
  'event:edit:own':         ['owner', 'admin', 'editor', 'contributor'],
  'event:edit:others':      ['owner', 'admin', 'editor'],
  'event:delete:own':       ['owner', 'admin', 'editor', 'contributor'],
  'event:delete:others':    ['owner', 'admin'],
  'milestone:create':       ['owner', 'admin', 'editor', 'contributor'],
  'character:edit':         ['owner', 'admin', 'editor'],
  'tag:manage':             ['owner', 'admin', 'editor'],
  'member:manage':          ['owner', 'admin'],
  'settings:theme':         ['owner', 'admin'],
  'settings:site':          ['owner'],
  'data:export':            ['owner', 'admin'],
  'data:import':            ['owner', 'admin'],
  'history:view:others':    ['owner', 'admin', 'editor'],
  'history:restore':        ['owner', 'admin', 'editor'],
  'custom_html:use':        ['owner', 'admin'],
}

export function usePermission() {
  const authStore = useAuthStore()

  function can(action: string): boolean {
    const role = authStore.role
    if (!role) return false
    return ROLE_PERMISSIONS[action]?.includes(role) ?? false
  }

  // 用于模板中的计算属性形式
  function canComputed(action: string) {
    return computed(() => can(action))
  }

  const isOwner = computed(() => authStore.role === 'owner')
  const isAdmin = computed(() => ['owner', 'admin'].includes(authStore.role ?? ''))
  const isEditor = computed(() => ['owner', 'admin', 'editor'].includes(authStore.role ?? ''))
  const isContributor = computed(() =>
    ['owner', 'admin', 'editor', 'contributor'].includes(authStore.role ?? ''),
  )

  return { can, canComputed, isOwner, isAdmin, isEditor, isContributor }
}
