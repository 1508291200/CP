<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-base font-semibold text-[var(--color-text-title)] mb-1">通知偏好</h2>
      <p class="text-sm text-[var(--color-text-secondary)]">
        配置您希望接收的通知类型。关闭后该类型通知将不再推送给您。
      </p>
    </div>

    <!-- 全站级偏好 -->
    <section>
      <h3 class="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
        全站通知
      </h3>
      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        <div
          v-for="type in ALL_NOTIFICATION_TYPES"
          :key="type"
          class="flex items-center justify-between px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <span class="text-lg">{{ typeIcon(type) }}</span>
            <span class="text-sm text-[var(--color-text-body)]">
              {{ NOTIFICATION_TYPE_LABELS[type] }}
            </span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="isEnabled(type)"
              @change="toggleGlobal(type)"
            />
            <div class="w-10 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer
              peer-checked:after:translate-x-5 peer-checked:bg-[var(--color-primary)]
              after:content-[''] after:absolute after:top-0.5 after:left-0.5
              after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"
            />
          </label>
        </div>
      </div>
    </section>

    <!-- CP 级独立订阅 -->
    <section v-if="cpStore.list.length > 0">
      <h3 class="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wide mb-1">
        按 CP 独立配置
      </h3>
      <p class="text-xs text-[var(--color-text-disabled)] mb-3">
        CP 级配置优先级高于全站配置。未单独设置的 CP 将继承全站偏好。
      </p>

      <!-- CP 选择器 -->
      <div class="flex gap-2 flex-wrap mb-4">
        <button
          v-for="cp in cpStore.list"
          :key="cp.id"
          class="px-3 py-1.5 rounded-full text-xs border transition-all"
          :class="selectedCpId === cp.id
            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
            : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border)]'"
          @click="selectCp(cp.id)"
        >
          {{ cp.name }}
        </button>
      </div>

      <!-- 选中 CP 的偏好 -->
      <div v-if="selectedCpId"
        class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]"
      >
        <div v-if="cpPrefsLoading" class="py-6 text-center text-[var(--color-text-disabled)] text-sm">
          加载中…
        </div>
        <div
          v-else
          v-for="type in CP_EVENT_TYPES"
          :key="type"
          class="flex items-center justify-between px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <span class="text-lg">{{ typeIcon(type) }}</span>
            <div>
              <span class="text-sm text-[var(--color-text-body)]">{{ NOTIFICATION_TYPE_LABELS[type] }}</span>
              <p v-if="cpPrefInherited(type)" class="text-xs text-[var(--color-text-disabled)]">
                继承全站设置
              </p>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="isCpEnabled(type)"
              @change="toggleCp(type)"
            />
            <div class="w-10 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer
              peer-checked:after:translate-x-5 peer-checked:bg-[var(--color-primary)]
              after:content-[''] after:absolute after:top-0.5 after:left-0.5
              after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"
            />
          </label>
        </div>
      </div>
    </section>

    <!-- 保存提示 -->
    <p class="text-xs text-[var(--color-text-disabled)]">偏好设置自动保存。</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useNotificationStore } from '../../stores/notification.js'
import { useCpStore } from '../../stores/cp.js'
import {
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from '../../api/notification.js'

const notifStore = useNotificationStore()
const cpStore    = useCpStore()

// 仅在 CP 设置中展示事件和成员相关的通知类型
const CP_EVENT_TYPES: NotificationType[] = [
  'event:created', 'event:updated', 'event:deleted', 'event:milestone',
  'member:joined', 'member:role_changed', 'member:removed',
]

const selectedCpId   = ref<string | undefined>()
const cpPrefs        = ref<Array<{ type: NotificationType; enabled: boolean; cpId?: string | null }>>([])
const cpPrefsLoading = ref(false)

onMounted(async () => {
  await notifStore.fetchPreferences()
  // 预加载 CP 列表
  if (!cpStore.list.length) {
    await cpStore.fetchList()
  }
})

// ── 全站偏好 ────────────────────────────────────────────────────────
function isEnabled(type: NotificationType): boolean {
  const pref = notifStore.preferences.find((p) => p.type === type && !p.cpId)
  return pref ? pref.enabled : true // 默认开启
}

async function toggleGlobal(type: NotificationType) {
  const current = isEnabled(type)
  await notifStore.setPreference(type, !current)
}

// ── CP 级偏好 ────────────────────────────────────────────────────────
async function selectCp(cpId: string) {
  selectedCpId.value = cpId
  cpPrefsLoading.value = true
  try {
    const prefs = await notifStore.fetchPreferences(cpId)
    cpPrefs.value = prefs
  } finally {
    cpPrefsLoading.value = false
  }
}

function isCpEnabled(type: NotificationType): boolean {
  const cpPref = cpPrefs.value.find((p) => p.type === type && p.cpId === selectedCpId.value)
  if (cpPref !== undefined) return cpPref.enabled
  return isEnabled(type) // 无 CP 级设置则继承全站
}

function cpPrefInherited(type: NotificationType): boolean {
  return !cpPrefs.value.some((p) => p.type === type && p.cpId === selectedCpId.value)
}

async function toggleCp(type: NotificationType) {
  if (!selectedCpId.value) return
  const current = isCpEnabled(type)
  await notifStore.setPreference(type, !current, selectedCpId.value)
  // 更新本地 CP 偏好缓存
  const idx = cpPrefs.value.findIndex((p) => p.type === type)
  if (idx !== -1) {
    cpPrefs.value[idx] = { ...cpPrefs.value[idx], enabled: !current }
  } else {
    cpPrefs.value.push({ type, enabled: !current, cpId: selectedCpId.value })
  }
}

// ── 工具 ────────────────────────────────────────────────────────────
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
</script>
