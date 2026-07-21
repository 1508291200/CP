<template>
  <div
    class="flex-shrink-0 w-48 snap-center bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] group"
  >
    <!-- 封面图（可选） -->
    <div class="h-28 bg-[var(--color-primary-bg)] overflow-hidden relative">
      <img v-if="milestone.icon && isUrl(milestone.icon)" :src="milestone.icon" class="w-full h-full object-cover" />
      <div v-else class="w-full h-full flex items-center justify-center text-4xl select-none">
        {{ milestone.icon || '🌟' }}
      </div>

      <!-- 编辑操作（hover 显示） -->
      <div
        v-if="can('cp:create')"
        class="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          class="w-6 h-6 rounded-full bg-white/80 text-[var(--color-text-body)] text-xs flex items-center justify-center hover:bg-white"
          @click.stop="$emit('edit', milestone)"
        >✎</button>
        <button
          class="w-6 h-6 rounded-full bg-white/80 text-[var(--color-danger)] text-xs flex items-center justify-center hover:bg-white"
          @click.stop="handleDelete"
        >×</button>
      </div>
    </div>

    <!-- 信息区 -->
    <div class="p-3">
      <div class="text-xs text-[var(--color-text-disabled)] mb-1">{{ displayDate }}</div>
      <h4 class="text-sm font-semibold text-[var(--color-text-title)] line-clamp-2 mb-1">{{ milestone.title }}</h4>
      <p v-if="milestone.description" class="text-xs text-[var(--color-text-secondary)] line-clamp-2">{{ milestone.description }}</p>

      <!-- 关联事件跳转 -->
      <button
        v-if="milestone.eventId"
        class="mt-2 text-xs text-[var(--color-primary)] hover:underline"
        @click.stop="$emit('jump-to-event', milestone.eventId)"
      >查看关联事件 →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MilestoneItem } from '@/types'
import { usePermission } from '@/composables/usePermission'
import { useMilestoneStore } from '@/stores/milestone'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ milestone: MilestoneItem }>()
const emit  = defineEmits<{
  edit:            [milestone: MilestoneItem]
  deleted:         [id: string]
  'jump-to-event': [eventId: string]
}>()

const { can }   = usePermission()
const msStore   = useMilestoneStore()
const toast     = useToast()

const displayDate = computed(() => {
  if (!props.milestone.milestoneDate) return ''
  return new Date(props.milestone.milestoneDate).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
})

function isUrl(s: string) {
  return s.startsWith('http://') || s.startsWith('https://')
}

async function handleDelete() {
  if (!confirm(`确认删除节点「${props.milestone.title}」？`)) return
  try {
    await msStore.deleteMilestone(props.milestone.cpId, props.milestone.id)
    toast.success('已删除')
    emit('deleted', props.milestone.id)
  } catch {
    toast.error('删除失败')
  }
}
</script>
