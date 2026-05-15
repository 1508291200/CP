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
        @edit="$emit('edit', $event)"
        @deleted="$emit('deleted', $event)"
        @milestone-toggled="(id: string, val: boolean) => $emit('milestone-toggled', id, val)"
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
import { ref, computed } from 'vue'
import type { EventItem, Importance } from '@/types'
import EventRow from './EventRow.vue'

const props = defineProps<{
  events:   EventItem[]
  cpId:     string
  collapseThreshold?: number
}>()

defineEmits<{
  edit:               [event: EventItem]
  deleted:            [id: string]
  'milestone-toggled': [id: string, value: boolean]
}>()

const threshold = computed(() => props.collapseThreshold ?? 4)
const showAll   = ref(false)

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
