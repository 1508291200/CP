<template>
  <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] p-3">
    <div class="flex items-center gap-2 flex-wrap">
      <!-- 日期 -->
      <input
        v-model="form.date"
        type="date"
        class="text-xs border border-[var(--color-border-input)] rounded-[var(--radius-input)] px-2 py-1.5 bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
      />

      <!-- 标题 -->
      <input
        ref="titleInput"
        v-model="form.title"
        placeholder="事件标题（Enter 保存，Esc 关闭）"
        class="flex-1 min-w-[180px] text-sm border border-[var(--color-border-input)] rounded-[var(--radius-input)] px-3 py-1.5 bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
        @keydown.enter.prevent="handleSave"
        @keydown.esc="$emit('close')"
      />

      <!-- 重要性 -->
      <select
        v-model="form.importance"
        class="text-xs border border-[var(--color-border-input)] rounded-[var(--radius-input)] px-2 py-1.5 bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
      >
        <option value="critical">核心</option>
        <option value="high">重要</option>
        <option value="medium">一般</option>
        <option value="normal">普通</option>
      </select>

      <!-- 保存 -->
      <button
        :disabled="saving || !form.title.trim()"
        class="px-3 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded-[var(--radius-btn)] disabled:opacity-40 transition-opacity hover:opacity-90"
        @click="handleSave"
      >{{ saving ? '保存中…' : '保存' }}</button>

      <!-- 展开完整编辑器 -->
      <button
        class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
        @click="$emit('expand')"
      >详细编辑 ↗</button>
    </div>

    <p v-if="error" class="text-xs text-[var(--color-danger)] mt-2">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted } from 'vue'
import { useEvent } from '@/composables/useEvent'

const props = defineProps<{ cpId: string }>()
const emit  = defineEmits<{ close: []; expand: []; saved: [] }>()

const { createEvent } = useEvent(props.cpId)

const titleInput = ref<HTMLInputElement | null>(null)
const saving     = ref(false)
const error      = ref('')

const form = reactive({
  title:      '',
  date:       new Date().toISOString().split('T')[0],
  importance: 'normal' as string,
})

async function handleSave() {
  if (!form.title.trim()) return
  saving.value = true
  error.value  = ''
  try {
    await createEvent({
      title:         form.title.trim(),
      eventDate:     form.date || null,
      datePrecision: 'day',
      importance:    form.importance,
    })
    form.title = ''
    emit('saved')
    await nextTick()
    titleInput.value?.focus()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  nextTick(() => titleInput.value?.focus())
})
</script>
