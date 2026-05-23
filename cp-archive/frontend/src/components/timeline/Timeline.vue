<template>
  <div>
    <!-- 空状态 -->
    <div v-if="!segments.length" class="text-center py-20">
      <div class="text-5xl mb-4">📅</div>
      <p class="text-[var(--color-text-secondary)] mb-4">还没有事件记录</p>
      <Button v-if="canCreate" @click="$emit('add-event')">添加第一个事件</Button>
    </div>

    <!-- 时间轴内容 -->
    <div v-else class="space-y-6">
      <div v-for="seg in segments" :key="seg.label">
        <!-- 年份锚点标题 -->
        <div class="flex items-center gap-3 mb-3">
          <span
            class="text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] px-2 py-0.5 rounded"
            :id="`year-${seg.label}`"
          >{{ seg.label }}</span>
          <div class="flex-1 h-px bg-[var(--color-border)]" />
          <span class="text-xs text-[var(--color-text-disabled)]">{{ seg.events.length }} 条</span>
        </div>

        <TimelineSegment
          :events="seg.events"
          :cp-id="cpId"
          :batch-mode="batchMode"
          :selected-ids="selectedIds"
          :highlight-event-id="highlightEventId"
          @edit="$emit('edit', $event)"
          @deleted="$emit('deleted', $event)"
          @milestone-toggled="(id: string, val: boolean) => $emit('milestone-toggled', id, val)"
          @toggle-select="$emit('toggle-select', $event)"
          @show-history="$emit('show-history', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EventItem } from '@/types'
import Button from '@/components/base/Button.vue'
import TimelineSegment from './TimelineSegment.vue'

const props = defineProps<{
  events:    EventItem[]
  cpId:      string
  canCreate?: boolean
  batchMode?: boolean
  selectedIds?: Set<string>
  highlightEventId?: string
}>()

defineEmits<{
  'add-event':         []
  edit:                [event: EventItem]
  deleted:             [id: string]
  'milestone-toggled': [id: string, value: boolean]
  'toggle-select':     [id: string]
  'show-history':      [event: EventItem]
}>()

interface Segment {
  label: string
  events: EventItem[]
}

const segments = computed<Segment[]>(() => {
  const map = new Map<string, EventItem[]>()

  for (const ev of props.events) {
    let label = '日期未知'
    if (ev.eventDate) {
      label = String(new Date(ev.eventDate).getFullYear())
    }
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(ev)
  }

  const known = [...map.entries()]
    .filter(([k]) => k !== '日期未知')
    .sort(([a], [b]) => Number(b) - Number(a))

  const unknown = map.has('日期未知') ? [['日期未知', map.get('日期未知')!] as const] : []

  return [...known, ...unknown].map(([label, events]) => ({ label, events }))
})
</script>
