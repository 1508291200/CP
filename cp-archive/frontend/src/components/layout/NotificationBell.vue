<template>
  <!-- 通知铃铛按钮 -->
  <div ref="containerRef" class="relative">
    <button
      class="relative p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)] hover:bg-[var(--color-bg-hover,rgba(0,0,0,0.05))] transition-colors"
      title="通知"
      @click="toggleDropdown"
    >
      <!-- 铃铛图标 -->
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <!-- 未读红点 -->
      <span
        v-if="notifStore.unreadCount > 0"
        class="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 bg-[var(--color-danger,#f43f5e)] rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none"
      >
        {{ notifStore.unreadCount > 99 ? '99+' : notifStore.unreadCount }}
      </span>
    </button>

    <!-- 下拉面板 -->
    <Transition name="dropdown-fade">
      <div
        v-if="open"
        class="absolute right-0 top-full mt-2 w-80 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-float,0_8px_24px_rgba(0,0,0,0.12))] z-50 overflow-hidden"
      >
        <!-- 面板头 -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <span class="font-medium text-sm text-[var(--color-text-title)]">通知</span>
          <button
            v-if="notifStore.unreadCount > 0"
            class="text-xs text-[var(--color-primary)] hover:underline"
            @click="handleMarkAllRead"
          >
            全部已读
          </button>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="py-8 text-center">
          <span class="text-[var(--color-text-disabled)] text-sm">加载中…</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="preview.length === 0" class="py-10 text-center">
          <div class="text-3xl mb-2">🔔</div>
          <p class="text-[var(--color-text-secondary)] text-sm">暂无通知</p>
        </div>

        <!-- 通知列表（最近 5 条） -->
        <ul v-else class="divide-y divide-[var(--color-border)]">
          <li
            v-for="n in preview"
            :key="n.id"
            class="px-4 py-3 flex gap-3 cursor-pointer transition-colors"
            :class="n.isRead ? 'hover:bg-[var(--color-bg-hover,rgba(0,0,0,0.03))]' : 'bg-[var(--color-primary-bg,rgba(var(--color-primary-rgb,255,105,180),0.06))] hover:bg-[var(--color-primary-bg)]'"
            @click="handleItemClick(n)"
          >
            <!-- 类型图标 -->
            <span class="text-lg shrink-0 mt-0.5">{{ typeIcon(n.type) }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-[var(--color-text-body)] truncate">{{ n.title }}</p>
              <p v-if="n.body" class="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">{{ n.body }}</p>
              <p class="text-xs text-[var(--color-text-disabled)] mt-1">{{ timeAgo(n.createdAt) }}</p>
            </div>
            <!-- 未读圆点 -->
            <span v-if="!n.isRead" class="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0 mt-2" />
          </li>
        </ul>

        <!-- 底部跳转 -->
        <div class="border-t border-[var(--color-border)] px-4 py-2 text-center">
          <RouterLink
            to="/notifications"
            class="text-xs text-[var(--color-primary)] hover:underline"
            @click="open = false"
          >
            查看全部通知
          </RouterLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../../stores/notification.js'
import type { Notification, NotificationType } from '../../api/notification.js'

const notifStore = useNotificationStore()
const router     = useRouter()

const open        = ref(false)
const loading     = ref(false)
const containerRef = ref<HTMLElement>()

// 最近 5 条预览
const preview = computed(() => notifStore.notifications.slice(0, 5))

// ── 下拉控制 ────────────────────────────────────────────────────────
async function toggleDropdown() {
  if (!open.value) {
    open.value = true
    if (notifStore.notifications.length === 0) {
      loading.value = true
      await notifStore.fetchNotifications({ reset: true })
      loading.value = false
    }
  } else {
    open.value = false
  }
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside, true))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside, true))

// ── 操作 ────────────────────────────────────────────────────────────
async function handleMarkAllRead() {
  await notifStore.markAllRead()
}

async function handleItemClick(n: Notification) {
  if (!n.isRead) {
    await notifStore.markRead([n.id])
  }
  open.value = false
  // 跳转到关联资源
  if (n.cpId && n.entityType === 'event' && n.entityId) {
    router.push(`/cps/${n.cpId}?tab=timeline`)
  } else if (n.cpId) {
    router.push(`/cps/${n.cpId}`)
  }
}

// ── 工具函数 ─────────────────────────────────────────────────────────
function typeIcon(type: NotificationType): string {
  const map: Record<NotificationType, string> = {
    'event:created':       '📅',
    'event:updated':       '✏️',
    'event:deleted':       '🗑️',
    'event:milestone':     '⭐',
    'member:joined':       '👋',
    'member:role_changed': '🔑',
    'member:removed':      '🚪',
    'cp:updated':          '💕',
  }
  return map[type] ?? '🔔'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return '刚刚'
  if (m < 60)  return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30)  return `${d} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
