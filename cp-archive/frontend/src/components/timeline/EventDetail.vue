<template>
  <div class="ml-4 bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-4 mt-1 mb-2">
    <!-- 元信息行 -->
    <div class="flex items-center gap-2 flex-wrap mb-3">
      <ImportanceTag :importance="event.importance" />
      <span class="text-xs text-[var(--color-text-disabled)]">{{ displayDate }}</span>
      <a
        v-if="event.sourceRef"
        :href="event.sourceRef"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs text-[var(--color-primary)] hover:underline ml-auto truncate max-w-[200px]"
      >来源 ↗</a>
    </div>

    <!-- 内容区：Tiptap JSON 渲染 -->
    <div
      v-if="renderedHtml"
      class="prose-render text-sm text-[var(--color-text-body)] leading-relaxed mb-3"
      v-html="renderedHtml"
    />
    <div v-else-if="plainText" class="text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-wrap mb-3">
      {{ plainText }}
    </div>

    <!-- 标签 -->
    <div v-if="event.emotionIcon || event.isMilestone" class="flex gap-2 mb-3">
      <span v-if="event.emotionIcon" class="text-base">{{ event.emotionIcon }}</span>
      <span v-if="event.isMilestone" class="text-xs bg-[var(--color-high)] text-white px-2 py-0.5 rounded-[var(--radius-tag)]">里程碑 🌟</span>
    </div>

    <!-- 操作按钮 -->
    <div class="flex items-center gap-3 pt-2 border-t border-[var(--color-border)]">
      <button
        v-if="can('event:create')"
        class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
        @click="$emit('edit')"
      >编辑</button>

      <button
        v-if="can('event:create')"
        class="text-xs transition-colors"
        :class="event.isMilestone ? 'text-[var(--color-high)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-high)]'"
        @click="$emit('milestone-toggled', !event.isMilestone)"
      >{{ event.isMilestone ? '★ 取消里程碑' : '☆ 标记里程碑' }}</button>

      <button
        v-if="can('event:delete:own')"
        class="text-xs text-[var(--color-text-disabled)] hover:text-[var(--color-danger)] transition-colors ml-auto"
        @click="handleDelete"
      >删除</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { generateHTML } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import type { EventItem } from '@/types'
import ImportanceTag from './ImportanceTag.vue'
import { usePermission } from '@/composables/usePermission'
import { useEvent } from '@/composables/useEvent'

const props = defineProps<{
  event: EventItem
  cpId:  string
}>()

const emit = defineEmits<{
  edit:               []
  deleted:            [id: string]
  'milestone-toggled': [value: boolean]
}>()

const { can } = usePermission()
const { deleteEvent } = useEvent(props.cpId)

const displayDate = computed(() => {
  if (!props.event.eventDate) return '日期未知'
  const d = new Date(props.event.eventDate)
  const p = props.event.datePrecision
  if (p === 'year')  return `${d.getFullYear()} 年`
  if (p === 'month') return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
})

// 尝试将 content 渲染为 HTML（Tiptap JSON 格式）
const renderedHtml = computed<string | null>(() => {
  const c = props.event.content as Record<string, unknown>
  if (!c || !c.type) return null  // 不是有效的 Tiptap doc
  try {
    return generateHTML(c as Parameters<typeof generateHTML>[0], [StarterKit, Image, Link])
  } catch {
    return null
  }
})

// 降级为纯文本（兼容旧数据中的 {text: '...'} 格式）
const plainText = computed<string | null>(() => {
  if (renderedHtml.value) return null
  const c = props.event.content as Record<string, unknown>
  if (c?.text && typeof c.text === 'string') return c.text
  return props.event.summary ?? null
})

async function handleDelete() {
  if (!confirm('确认删除这条事件记录？')) return
  await deleteEvent(props.event.id)
  emit('deleted', props.event.id)
}
</script>
