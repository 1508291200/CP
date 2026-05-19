<template>
  <!-- 右侧抽屉 -->
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex justify-end">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/30" @click="$emit('close')" />

        <!-- 抽屉主体 -->
        <div class="relative w-80 bg-[var(--color-bg-card)] shadow-[var(--shadow-modal)] flex flex-col h-full">
          <!-- 标题栏 -->
          <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <span class="font-medium text-[var(--color-text-body)] text-sm">编辑历史</span>
            <button class="text-[var(--color-text-disabled)] hover:text-[var(--color-text-body)]" @click="$emit('close')">✕</button>
          </div>

          <!-- 加载中 -->
          <div v-if="loading" class="flex-1 flex items-center justify-center">
            <span class="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>

          <!-- 空状态 -->
          <div v-else-if="!versions.length" class="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
            暂无历史记录
          </div>

          <!-- 版本列表 -->
          <div v-else class="flex-1 overflow-y-auto">
            <div
              v-for="(v, idx) in versions"
              :key="v.id"
              class="group px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-page)] transition-colors"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-xs font-medium text-[var(--color-text-body)] truncate">
                    {{ (v.snapshot['title'] as string) || '无标题' }}
                  </div>
                  <div class="text-xs text-[var(--color-text-disabled)] mt-0.5">
                    {{ formatTime(v.createdAt) }}
                    <span class="ml-1 text-[var(--color-text-secondary)]">版本 #{{ versions.length - idx }}</span>
                  </div>
                  <div class="text-xs text-[var(--color-text-secondary)] mt-0.5 flex items-center gap-1">
                    <span
                      class="inline-block w-2 h-2 rounded-full"
                      :style="{ background: importanceColor(v.snapshot['importance'] as string) }"
                    />
                    {{ v.snapshot['importance'] || 'normal' }}
                  </div>
                </div>

                <button
                  v-if="canInCp(cpId, 'history:restore')"
                  class="flex-shrink-0 text-xs text-[var(--color-primary)] hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                  :disabled="restoring === v.id"
                  @click="handleRestore(v)"
                >{{ restoring === v.id ? '还原中…' : '还原' }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { eventApi, type EventVersion } from '@/api/event'
import { usePermission } from '@/composables/usePermission'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  visible:  boolean
  cpId:     string
  eventId:  string
}>()

const emit = defineEmits<{
  close:    []
  restored: []
}>()

const { canInCp } = usePermission()
const toast     = useToast()
const versions  = ref<EventVersion[]>([])
const loading   = ref(false)
const restoring = ref<string>('')

async function load() {
  if (!props.eventId) return
  loading.value = true
  try {
    const res = await eventApi.listVersions(props.cpId, props.eventId)
    versions.value = res.data
  } finally {
    loading.value = false
  }
}

watch(() => [props.visible, props.eventId], ([vis]) => {
  if (vis) load()
}, { immediate: true })

async function handleRestore(v: EventVersion) {
  if (!confirm(`确认还原到该版本？当前内容将保存为新的历史记录。`)) return
  restoring.value = v.id
  try {
    await eventApi.restoreVersion(props.cpId, props.eventId, v.id)
    toast.success('已还原')
    emit('restored')
    emit('close')
  } catch {
    toast.error('还原失败')
  } finally {
    restoring.value = ''
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const IMPORTANCE_COLORS: Record<string, string> = {
  critical: '#e53e3e',
  high:     '#e59b00',
  medium:   '#7B5EA7',
  normal:   '#718096',
  low:      '#a0aec0',
}

function importanceColor(imp: string) {
  return IMPORTANCE_COLORS[imp] ?? '#a0aec0'
}
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active { transition: all 0.25s ease; }
.drawer-enter-from,
.drawer-leave-to { opacity: 0; transform: translateX(100%); }
</style>
