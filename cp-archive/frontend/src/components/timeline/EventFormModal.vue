<template>
  <Modal
    :visible="visible"
    :title="isEdit ? '编辑事件' : '新增事件'"
    @update:visible="$emit('update:visible', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <!-- 标题 -->
      <Input
        v-model="form.title"
        label="事件标题"
        placeholder="简短描述这个事件"
        required
        :error="errors.title"
      />

      <!-- 日期 + 精度 -->
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[var(--color-text-body)]">日期</label>
          <input
            v-model="form.eventDate"
            type="date"
            class="px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[var(--color-text-body)]">精度</label>
          <select
            v-model="form.datePrecision"
            class="px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
          >
            <option value="day">精确到日</option>
            <option value="month">精确到月</option>
            <option value="year">精确到年</option>
          </select>
        </div>
      </div>

      <!-- 重要性 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">重要程度</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="opt in importanceOptions"
            :key="opt.value"
            type="button"
            class="px-3 py-1 text-xs rounded-[var(--radius-btn)] border transition-all"
            :class="form.importance === opt.value
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
              : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'"
            @click="form.importance = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>

      <!-- 内容（Phase 6 前为 textarea） -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">详细内容</label>
        <BlockEditor
          v-model="form.contentJson"
          placeholder="详细描述这个事件的经过..."
        />
      </div>

      <!-- 来源 -->
      <Input
        v-model="form.sourceRef"
        label="来源链接"
        placeholder="https://... （可选）"
      />

      <!-- 情绪图标 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">情感标记</label>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="emoji in emotionEmojis"
            :key="emoji"
            type="button"
            class="w-8 h-8 text-lg rounded-[var(--radius-tag)] border transition-all"
            :class="form.emotionIcon === emoji
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'"
            @click="form.emotionIcon = form.emotionIcon === emoji ? '' : emoji"
          >{{ emoji }}</button>
        </div>
      </div>

      <!-- 可见范围 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">可见范围</label>
        <select
          v-model="form.visibility"
          class="px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
        >
          <option value="public">公开</option>
          <option value="members">站内成员</option>
          <option value="private">仅自己</option>
        </select>
      </div>
    </form>

    <template #footer>
      <Button variant="ghost" @click="$emit('update:visible', false)">取消</Button>
      <Button :loading="submitting" @click="handleSubmit">{{ isEdit ? '保存修改' : '创建事件' }}</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import Modal from '@/components/base/Modal.vue'
import Input from '@/components/base/Input.vue'
import Button from '@/components/base/Button.vue'
import BlockEditor from '@/components/editor/BlockEditor.vue'
import { useEvent } from '@/composables/useEvent'
import { ApiClientError } from '@/api/client'
import { useToast } from '@/composables/useToast'
import type { EventItem, Importance } from '@/types'

const props = defineProps<{
  visible:  boolean
  cpId:     string
  event?:   EventItem | null  // 编辑时传入
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  saved:            [event: EventItem]
}>()

const { createEvent, updateEvent } = useEvent(props.cpId)
const toast = useToast()

const isEdit    = computed(() => !!props.event)
const submitting = ref(false)
const errors     = reactive({ title: '' })

const DRAFT_KEY = computed(() => `draft:${props.cpId}`)

const importanceOptions = [
  { value: 'critical', label: '核心' },
  { value: 'high',     label: '重要' },
  { value: 'medium',   label: '一般' },
  { value: 'normal',   label: '普通' },
  { value: 'low',      label: '备注' },
]

const emotionEmojis = ['💕', '🌟', '😭', '😂', '🔥', '💎', '🎉', '💔', '✨', '🥺']

/** 从 Tiptap JSON 中提取纯文本（用于 summary 字段） */
function extractText(json: Record<string, unknown> | null): string {
  if (!json) return ''
  const walk = (node: Record<string, unknown>): string => {
    if (node.type === 'text') return (node.text as string) ?? ''
    if (Array.isArray(node.content)) {
      return (node.content as Record<string, unknown>[]).map(walk).join('')
    }
    return ''
  }
  return walk(json)
}

const form = reactive({
  title:         '',
  eventDate:     new Date().toISOString().split('T')[0],
  datePrecision: 'day' as string,
  importance:    'normal' as string,
  contentJson:   null as Record<string, unknown> | null,
  sourceRef:     '',
  emotionIcon:   '',
  visibility:    'members' as string,
})

// 编辑模式：回填数据
watch(() => props.event, (ev) => {
  if (ev) {
    form.title         = ev.title
    form.eventDate     = ev.eventDate ?? new Date().toISOString().split('T')[0]
    form.datePrecision = ev.datePrecision
    form.importance    = ev.importance
    form.contentJson   = (ev.content && Object.keys(ev.content).length > 0)
      ? ev.content as Record<string, unknown>
      : null
    form.sourceRef     = ev.sourceRef ?? ''
    form.emotionIcon   = ev.emotionIcon ?? ''
    form.visibility    = ev.visibility
  }
}, { immediate: true })

// 草稿自动保存（仅新建模式）
let draftTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (!props.event) {
    // 恢复草稿
    try {
      const saved = localStorage.getItem(DRAFT_KEY.value)
      if (saved) Object.assign(form, JSON.parse(saved))
    } catch { /* ignore */ }

    draftTimer = setInterval(() => {
      localStorage.setItem(DRAFT_KEY.value, JSON.stringify(form))
    }, 10000)
  }
})

onUnmounted(() => {
  if (draftTimer) clearInterval(draftTimer)
})

async function handleSubmit() {
  errors.title = form.title.trim() ? '' : '请填写事件标题'
  if (errors.title) return

  submitting.value = true
  try {
    const payload = {
      title:         form.title.trim(),
      eventDate:     form.eventDate || null,
      datePrecision: form.datePrecision,
      importance:    form.importance as Importance,
      content:       form.contentJson ?? {},
      summary:       extractText(form.contentJson).slice(0, 100),
      sourceRef:     form.sourceRef || undefined,
      emotionIcon:   form.emotionIcon || undefined,
      visibility:    form.visibility,
    }

    let ev: EventItem
    if (isEdit.value && props.event) {
      ev = await updateEvent(props.event.id, payload)
    } else {
      ev = await createEvent(payload)
      localStorage.removeItem(DRAFT_KEY.value)
    }

    emit('update:visible', false)
    emit('saved', ev)
  } catch (err) {
    toast.error(err instanceof ApiClientError ? err.message : '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>
