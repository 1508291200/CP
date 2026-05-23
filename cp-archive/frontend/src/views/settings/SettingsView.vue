<template>
  <div class="min-h-screen bg-[var(--color-bg-page)]">
    <!-- 导航栏 -->
    <nav class="sticky top-0 z-50 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] shadow-[var(--shadow-card)]">
      <div class="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
        <button
          class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          @click="router.push('/')"
        >← 返回首页</button>
        <span class="font-semibold text-[var(--color-text-title)]">设置</span>
      </div>
    </nav>

    <div class="max-w-5xl mx-auto px-6 py-8 flex gap-8">
      <!-- 左侧导航 -->
      <aside class="w-44 flex-shrink-0">
        <ul class="space-y-1">
          <li v-for="item in menuItems" :key="item.to">
            <RouterLink
              v-if="!item.requireRole || can(item.requireRole)"
              :to="item.to"
              class="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-card)] text-sm transition-colors"
              :class="isActiveMenu(item.to)
                ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] font-medium'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-page)] hover:text-[var(--color-text-body)]'"
            >
              <span>{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </aside>

      <!-- 右侧内容 -->
      <main class="flex-1 min-w-0">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { usePermission } from '@/composables/usePermission'

const router = useRouter()
const route  = useRoute()
const { can } = usePermission()

const menuItems = [
  { label: '主题与外观', to: '/settings/theme',         icon: '🎨' },
  { label: '个人资料',   to: '/settings/profile',        icon: '👤' },
  { label: '通知偏好',   to: '/settings/notifications',  icon: '🔔' },
  { label: '成员管理',   to: '/settings/members',        icon: '👥', requireRole: 'member:manage' },
  { label: '数据管理',   to: '/settings/data',           icon: '💾', requireRole: 'data:export' },
  { label: '操作日志',   to: '/settings/logs',           icon: '📋', requireRole: 'log:view' },
]

function isActiveMenu(to: string) {
  return route.path.startsWith(to)
}
</script>
