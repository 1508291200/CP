<template>
  <div class="min-h-screen bg-[var(--color-bg-page)]">
    <!-- 顶部栏 -->
    <div class="sticky top-0 z-10 bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
      <div class="max-w-2xl mx-auto px-6 h-14 flex items-center gap-4">
        <button
          class="text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]"
          @click="router.back()"
        >
          ← 返回
        </button>
        <h1 class="font-semibold text-[var(--color-text-title)] flex-1">通知中心</h1>
        <button
          v-if="notifStore.unreadCount > 0"
          class="text-xs text-[var(--color-primary)] hover:underline"
          @click="notifStore.markAllRead()"
        >
          全部已读
        </button>
      </div>
    </div>

    <div class="max-w-2xl mx-auto px-6 py-6">
      <!-- 过滤器 -->
      <div class="flex gap-2 mb-5">
        <button
          class="px-3 py-1.5 rounded-full text-sm transition-all"
          :class="unreadOnly
            ? 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
            : 'bg-[var(--color-primary)] text-white'"
          @click="setFilter(false)"
        >全部</button>
        <button
          class="px-3 py-1.5 rounded-full text-sm transition-all"
          :class="unreadOnly
            ? 'bg-[var(--color-primary)] text-white'
            : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'"
          @click="setFilter(true)"
        >
          未读
          <span v-if="notifStore.unreadCount > 0" class="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
            {{ notifStore.unreadCount }}
          </span>
        </button>
      </div>

      <!-- 加载骨架 -->
      <div v-if="notifStore.loading && !notifStore.notifications.length" class="space-y-3">
        <div v-for="i in 5" :key="i"
          class="h-16 bg-[var(--color-bg-card)] rounded-[var(--radius-card)] animate-pulse" />
      </div>

      <!-- 空状态 -->
      <div v-else-if="!notifStore.loading && !notifStore.notifications.length"
        class="text-center py-20"
      >
        <div class="text-5xl mb-4">🔔</div>
        <p class="text-[var(--color-text-secondary)]">
          {{ unreadOnly ? '没有未读通知' : '暂无通知' }}
        </p>
      </div>

      <!-- 通知列表 -->
      <ul v-else class="space-y-2">
        <li
          v-for="n in notifStore.notifications"
          :key="n.id"
          class="flex gap-3 px-4 py-3 rounded-[var(--radius-card)] border transition-all cursor-pointer"
          :class="n.isRead
            ? 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-border-active,var(--color-primary))]'
            : 'bg-[var(--color-primary-bg,rgba(255,105,180,0.06))] border-[var(--color-primary)] border-opacity-30'"
          @click="handleClick(n)"
        >
          <span class="text-xl shrink-0 mt-0.5">{{ typeIcon(n.type) }}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-[var(--color-text-body)] truncate flex-1">{{ n.title }}</p>
              <span v-if="!n.isRead" class="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />
            </div>
            <p v-if="n.body" class="text-xs text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
              {{ n.body }}
            </p>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-xs text-[var(--color-text-disabled)]">{{ timeAgo(n.createdAt) }}</span>
              <span class="text-xs text-[var(--color-text-disabled)] bg-[var(--color-bg-page)] px-1.5 py-0.5 rounded-full">
                {{ typeName(n.type) }}
              </span>
            </div>
          </div>
        </li>
      </ul>

      <!-- 加载更多 -->
      <div v-if="notifStore.hasMore" class="text-center mt-6">
        <button
          class="text-sm text-[var(--color-primary)] hover:underline"
          :disabled="notifStore.loading"
          @click="loadMore"
        >
          {{ notifStore.loading ? '加载中…' : '加载更多' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '../stores/notification.js'
import type { Notification, NotificationType } from '../api/notification.js'
import { NOTIFICATION_TYPE_LABELS } from '../api/notification.js'

const router     = useRouter()
const notifStore = useNotificationStore()

const unreadOnly = ref(false)

onMounted(() => {
  notifStore.fetchNotifications({ reset: true, unreadOnly: unreadOnly.value })
})

function setFilter(val: boolean) {
  unreadOnly.value = val
  notifStore.fetchNotifications({ reset: true, unreadOnly: val })
}

function loadMore() {
  notifStore.fetchNotifications({ unreadOnly: unreadOnly.value })
}

async function handleClick(n: Notification) {
  if (!n.isRead) {
    await notifStore.markRead([n.id])
  }
  if (n.cpId && n.entityType === 'event') {
    router.push(`/cps/${n.cpId}?tab=timeline`)
  } else if (n.cpId) {
    router.push(`/cps/${n.cpId}`)
  }
}

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

function typeName(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} 天前`
  return new Date(dateStr).toLocaleDateString('zh-CN')
}
</script>
