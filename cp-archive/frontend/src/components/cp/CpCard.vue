<template>
  <div
    class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden cursor-pointer transition-all duration-[var(--duration-normal)] hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] group"
    @click="$emit('click', cp)"
  >
    <!-- 封面图 -->
    <div class="relative aspect-[4/3] bg-[var(--color-bg-page)] overflow-hidden">
      <img
        v-if="cp.coverUrl"
        :src="cp.coverUrl"
        :alt="cp.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-4xl select-none opacity-30">
        💕
      </div>

      <!-- 状态标签（非 active 时显示）-->
      <span
        v-if="cp.status !== 'active'"
        class="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-[var(--radius-tag)] bg-black/50 text-white/80"
      >{{ statusLabel }}</span>
    </div>

    <!-- 信息区 -->
    <div class="p-4">
      <h3 class="font-semibold text-[var(--color-text-title)] text-sm leading-tight mb-0.5 truncate">
        {{ cp.name }}
      </h3>
      <p v-if="cp.subtitle" class="text-xs text-[var(--color-text-secondary)] truncate mb-2">
        {{ cp.subtitle }}
      </p>

      <!-- 底部：标签 + 更新时间 -->
      <div class="flex items-center justify-between mt-2">
        <div class="flex gap-1 flex-wrap">
          <slot name="tags" />
        </div>
        <span class="text-xs text-[var(--color-text-disabled)] whitespace-nowrap ml-2">
          {{ relativeTime }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CpItem } from '@/types'

interface Props { cp: CpItem }
const props = defineProps<Props>()
defineEmits<{ click: [cp: CpItem] }>()

const statusLabel = computed(() =>
  ({ archived: '已归档', completed: '完结', active: '' }[props.cp.status]))

const relativeTime = computed(() => {
  const diff = Date.now() - new Date(props.cp.updatedAt).getTime()
  const mins = diff / 60000
  if (mins < 60) return `${Math.floor(mins)}分钟前`
  const hours = mins / 60
  if (hours < 24) return `${Math.floor(hours)}小时前`
  const days = hours / 24
  if (days < 30) return `${Math.floor(days)}天前`
  return new Date(props.cp.updatedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
})
</script>
