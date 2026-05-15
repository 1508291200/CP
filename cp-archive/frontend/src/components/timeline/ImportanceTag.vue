<template>
  <span
    class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-[var(--radius-tag)]"
    :class="colorClass"
  >{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Importance } from '@/types'

const props = defineProps<{ importance: Importance }>()

const MAP: Record<Importance, { label: string; cls: string }> = {
  critical: { label: '核心',   cls: 'bg-[var(--color-critical)] text-white' },
  high:     { label: '重要',   cls: 'bg-[var(--color-high)] text-white' },
  medium:   { label: '一般',   cls: 'bg-[var(--color-medium)] text-white' },
  normal:   { label: '普通',   cls: 'bg-[var(--color-bg-page)] text-[var(--color-text-secondary)] border border-[var(--color-border)]' },
  low:      { label: '备注',   cls: 'bg-[var(--color-low)] text-white' },
}

const label      = computed(() => MAP[props.importance]?.label ?? props.importance)
const colorClass = computed(() => MAP[props.importance]?.cls ?? '')
</script>
