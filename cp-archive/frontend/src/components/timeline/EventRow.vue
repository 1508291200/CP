<template>
  <div>
    <!-- 事件行 -->
    <div
      class="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-card)] cursor-pointer transition-colors group"
      :class="isExpanded ? 'bg-[var(--color-primary-bg)]' : 'hover:bg-[var(--color-bg-page)]'"
      @click="toggle"
      @contextmenu.prevent="showCtxMenu = !showCtxMenu"
    >
      <!-- 轴节点 -->
      <div class="flex-shrink-0 mt-1 w-3 h-3 rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-bg-card)] ring-2 ring-[var(--color-bg-card)]" />

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <ImportanceTag :importance="event.importance" />
          <span class="text-sm font-medium text-[var(--color-text-title)] leading-tight">{{ event.title }}</span>
        </div>

        <div class="flex items-center gap-3 mt-1">
          <span class="text-xs text-[var(--color-text-disabled)]">{{ displayDate }}</span>
          <span v-if="event.sourceRef" class="text-xs text-[var(--color-primary)] opacity-70 truncate max-w-[120px]">
            {{ event.sourceRef }}
          </span>
          <span v-if="event.isMilestone" class="text-xs text-[var(--color-high)]">🌟 里程碑</span>
        </div>
      </div>

      <!-- 展开指示 -->
      <span
        class="flex-shrink-0 text-[var(--color-text-disabled)] transition-transform duration-[var(--duration-fast)] text-xs mt-1"
        :class="isExpanded ? 'rotate-180' : ''"
      >▾</span>
    </div>

    <!-- 内联详情展开 -->
    <Transition name="expand">
      <EventDetail
        v-if="isExpanded"
        :event="event"
        :cp-id="cpId"
        @edit="$emit('edit', event)"
        @deleted="$emit('deleted', event.id)"
        @milestone-toggled="$emit('milestone-toggled', event.id, $event)"
      />
    </Transition>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="showCtxMenu"
        class="fixed z-50 bg-[var(--color-bg-card)] shadow-[var(--shadow-modal)] rounded-[var(--radius-card)] py-1 min-w-[120px]"
        :style="{ top: menuY + 'px', left: menuX + 'px' }"
        v-click-outside="() => showCtxMenu = false"
      >
        <button class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-bg-page)] text-[var(--color-text-body)]" @click.stop="onEdit">编辑</button>
        <button class="w-full px-4 py-2 text-left text-sm hover:bg-[var(--color-bg-page)] text-[var(--color-danger)]" @click.stop="onDelete">删除</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { EventItem } from '@/types'
import ImportanceTag from './ImportanceTag.vue'
import EventDetail from './EventDetail.vue'

const props = defineProps<{
  event: EventItem
  cpId: string
  compact?: boolean
}>()

const emit = defineEmits<{
  edit:             [event: EventItem]
  deleted:          [id: string]
  'milestone-toggled': [id: string, value: boolean]
}>()

const isExpanded  = ref(false)
const showCtxMenu = ref(false)
const menuX       = ref(0)
const menuY       = ref(0)

function toggle() {
  isExpanded.value = !isExpanded.value
}

function onEdit() {
  showCtxMenu.value = false
  emit('edit', props.event)
}

function onDelete() {
  showCtxMenu.value = false
  emit('deleted', props.event.id)
}

const displayDate = computed(() => {
  if (!props.event.eventDate) return '日期未知'
  const d = new Date(props.event.eventDate)
  const precision = props.event.datePrecision
  if (precision === 'year')  return d.getFullYear() + ' 年'
  if (precision === 'month') return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
})

// 简单的 v-click-outside 指令（局部注册）
interface HTMLElementWithClickOutside extends HTMLElement {
  _clickOutside?: (e: MouseEvent) => void
}
const vClickOutside = {
  mounted(el: HTMLElementWithClickOutside, binding: { value: () => void }) {
    el._clickOutside = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el: HTMLElementWithClickOutside) {
    if (el._clickOutside) {
      document.removeEventListener('click', el._clickOutside)
    }
  },
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all var(--duration-normal) var(--easing-out);
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
