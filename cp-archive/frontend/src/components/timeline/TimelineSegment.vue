<template>
  <div
    class="ml-4 pl-4 py-4 border-l-2 border-[var(--color-border)] mb-2"
    :style="{ borderColor: axisColor }"
  >
    <!-- 事件内容 -->
    <div class="space-y-0.5">
      <EventRow
        v-for="event in visibleEvents"
        :key="event.id"
        :event="event"
        :cp-id="cpId"
        :batch-mode="batchMode"
        :selected="selectedIds?.has(event.id)"
        :highlighted="event.id === highlightEventId"
        @edit="$emit('edit', $event)"
        @deleted="$emit('deleted', $event)"
        @milestone-toggled="(id: string, val: boolean) => $emit('milestone-toggled', id, val)"
        @toggle-select="$emit('toggle-select', $event)"
        @show-history="$emit('show-history', $event)"
      />
    </div>

    <!-- 折叠展开按钮 -->
    <button
      v-if="events.length > threshold"
      class="mt-2 ml-4 text-xs text-[var(--color-primary)] hover:underline"
      @click="showAll = !showAll"
    >
      {{ showAll ? '收起 ∧' : `展开更多 (${events.length - threshold}) ∨` }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { EventItem, Importance } from '@/types'
import EventRow from './EventRow.vue'

const props = defineProps<{
  events:   EventItem[]
  cpId:     string
  collapseThreshold?: number
  batchMode?: boolean
  selectedIds?: Set<string>
  highlightEventId?: string
}>()

defineEmits<{
  edit:               [event: EventItem]
  deleted:            [id: string]
  'milestone-toggled': [id: string, value: boolean]
  'toggle-select':    [id: string]
  'show-history':     [event: EventItem]
}>()

const threshold = computed(() => props.collapseThreshold ?? 4)
const showAll   = ref(false)

// 当高亮事件在折叠区域时，自动展开
watch(() => props.highlightEventId, (id) => {
  if (!id) return
  const idx = props.events.findIndex(e => e.id === id)
  if (idx >= threshold.value) {
    showAll.value = true
  }
})

const visibleEvents = computed(() =>
  showAll.value ? props.events : props.events.slice(0, threshold.value)
)

// 轴线颜色：依据段内最高重要级别决定
const AXIS_COLORS: Record<Importance, string> = {
  critical: 'var(--color-critical)',
  high:     'var(--color-high)',
  medium:   'var(--color-medium)',
  normal:   'var(--color-border)',
  low:      'var(--color-low)',
}
const IMPORTANCE_ORDER: Importance[] = ['critical', 'high', 'medium', 'normal', 'low']

const axisColor = computed(() => {
  const levels = props.events.map(e => e.importance as Importance)
  const top = IMPORTANCE_ORDER.find(imp => levels.includes(imp)) ?? 'normal'
  return AXIS_COLORS[top]
})
</script>
