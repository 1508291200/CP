/**
 * 通知 Store
 *
 * 职责：
 *   - 缓存通知列表和未读数
 *   - 每 30s 轮询未读数（startPolling / stopPolling 生命周期管理）
 *   - 提供标记已读、获取偏好、更新偏好等操作
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  notificationApi,
  type Notification,
  type NotificationPreference,
  type NotificationType,
} from '../api/notification.js'

const POLL_INTERVAL = 30_000 // 30s

export const useNotificationStore = defineStore('notification', () => {
  // ── 状态 ──────────────────────────────────────────────────────────
  const notifications = ref<Notification[]>([])
  const unreadCount   = ref(0)
  const preferences   = ref<NotificationPreference[]>([])
  const total         = ref(0)
  const page          = ref(1)
  const hasMore       = ref(false)
  const loading       = ref(false)

  let pollTimer: ReturnType<typeof setInterval> | null = null

  // ── 计算属性 ──────────────────────────────────────────────────────
  const hasUnread = computed(() => unreadCount.value > 0)

  // ── 轮询控制 ──────────────────────────────────────────────────────

  /** 启动轮询（在用户登录后调用） */
  function startPolling() {
    if (pollTimer) return
    // 立即执行一次
    fetchUnreadCount()
    pollTimer = setInterval(fetchUnreadCount, POLL_INTERVAL)
  }

  /** 停止轮询（在用户注销后调用） */
  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    // 清空状态
    notifications.value = []
    unreadCount.value   = 0
    preferences.value   = []
  }

  // ── 数据获取 ──────────────────────────────────────────────────────

  async function fetchUnreadCount() {
    try {
      const res = await notificationApi.getUnreadCount()
      unreadCount.value = res.data.count
    } catch {
      // 静默失败（网络问题时不干扰 UI）
    }
  }

  async function fetchNotifications(opts?: { reset?: boolean; unreadOnly?: boolean }) {
    loading.value = true
    try {
      const currentPage = opts?.reset ? 1 : page.value
      const res = await notificationApi.list({
        page:       currentPage,
        limit:      20,
        unreadOnly: opts?.unreadOnly,
      })

      if (opts?.reset) {
        notifications.value = res.data
        page.value          = 1
      } else {
        notifications.value = [...notifications.value, ...res.data]
      }

      if (res.meta) {
        total.value   = res.meta.total
        hasMore.value = res.meta.hasMore
        page.value    = currentPage + 1
      }

      // 同步未读数
      unreadCount.value = notifications.value.filter((n) => !n.isRead).length
    } finally {
      loading.value = false
    }
  }

  async function fetchPreferences(cpId?: string) {
    const res = await notificationApi.getPreferences(cpId)
    if (!cpId) {
      preferences.value = res.data
    }
    return res.data
  }

  // ── 操作 ──────────────────────────────────────────────────────────

  async function markRead(ids: string[]) {
    await notificationApi.markRead(ids)
    // 乐观更新
    notifications.value = notifications.value.map((n) =>
      ids.includes(n.id) ? { ...n, isRead: true } : n,
    )
    unreadCount.value = Math.max(0, unreadCount.value - ids.length)
  }

  async function markAllRead() {
    await notificationApi.markAllRead()
    notifications.value = notifications.value.map((n) => ({ ...n, isRead: true }))
    unreadCount.value = 0
  }

  async function setPreference(type: NotificationType, enabled: boolean, cpId?: string) {
    await notificationApi.setPreference({ type, enabled, cpId })
    // 更新本地偏好缓存
    const idx = preferences.value.findIndex(
      (p) => p.type === type && (p.cpId ?? undefined) === cpId,
    )
    if (idx !== -1) {
      preferences.value[idx] = { ...preferences.value[idx], enabled }
    } else {
      preferences.value.push({ userId: '', type, enabled, cpId: cpId ?? null })
    }
  }

  async function batchSetPreferences(
    prefs: Array<{ type: NotificationType; enabled: boolean; cpId?: string }>,
  ) {
    await notificationApi.batchSetPreferences(prefs)
    // 全量刷新偏好
    await fetchPreferences()
  }

  return {
    // 状态
    notifications,
    unreadCount,
    preferences,
    total,
    hasMore,
    loading,
    // 计算
    hasUnread,
    // 方法
    startPolling,
    stopPolling,
    fetchUnreadCount,
    fetchNotifications,
    fetchPreferences,
    markRead,
    markAllRead,
    setPreference,
    batchSetPreferences,
  }
})
