<template>
  <Modal
    :visible="visible"
    :title="isEdit ? '编辑节点' : '添加节点'"
    @update:visible="$emit('update:visible', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <!-- 标题 -->
      <Input v-model="form.title" label="节点标题" placeholder="为这个节点起个标题" required :error="errors.title" />

      <!-- 日期 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">日期</label>
        <input
          v-model="form.milestoneDate"
          type="date"
          class="px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
        />
      </div>

      <!-- 图标 / Emoji -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-[var(--color-text-body)]">图标</label>
        <div class="flex gap-2 flex-wrap mb-2">
          <button
            v-for="emoji in iconOptions"
            :key="emoji"
            type="button"
            class="w-9 h-9 text-xl rounded-[var(--radius-card)] border transition-all"
            :class="form.icon === emoji
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'"
            @click="form.icon = form.icon === emoji ? '' : emoji"
          >{{ emoji }}</button>
        </div>
        <Input v-model="form.icon" placeholder="或输入图片 URL / emoji" />
      </div>

      <!-- 描述 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">描述</label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="记录这个节点的意义..."
          class="w-full px-3 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)] resize-none placeholder:text-[var(--color-text-disabled)]"
        />
      </div>

      <!-- 关联时间轴事件 -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">关联时间轴事件</label>
        <select
          v-model="form.eventId"
          class="px-3 py-2 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">-- 不关联 --</option>
          <option v-for="ev in milestoneEvents" :key="ev.id" :value="ev.id">
            {{ ev.title }}（{{ formatEventDate(ev.eventDate) }}）
          </option>
        </select>
        <p class="text-xs text-[var(--color-text-disabled)]">仅显示已标为节点的时间轴事件</p>
      </div>
    </form>

    <template #footer>
      <Button variant="ghost" @click="$emit('update:visible', false)">取消</Button>
      <Button :loading="submitting" @click="handleSubmit">{{ isEdit ? '保存修改' : '添加节点' }}</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import Modal from '@/components/base/Modal.vue'
import Input from '@/components/base/Input.vue'
import Button from '@/components/base/Button.vue'
import { useMilestoneStore } from '@/stores/milestone'
import { useEventStore } from '@/stores/event'
import { useToast } from '@/composables/useToast'
import { ApiClientError } from '@/api/client'
import type { MilestoneItem } from '@/types'

const props = defineProps<{
  visible:    boolean
  cpId:       string
  milestone?: MilestoneItem | null
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  saved:            []
}>()

const msStore    = useMilestoneStore()
const eventStore = useEventStore()
const toast      = useToast()
const submitting = ref(false)
const isEdit     = computed(() => !!props.milestone)
const errors     = reactive({ title: '' })

const iconOptions = ['🌟', '❤️', '💕', '🎉', '🔥', '💎', '🌈', '✨', '🎂', '🎬', '📸', '💌']

const form = reactive({
  title:         '',
  milestoneDate: '',
  icon:          '',
  description:   '',
  eventId:       '',
})

// 已标记为里程碑的事件（用于关联选择）
const milestoneEvents = computed(() =>
  eventStore.getEvents(props.cpId).filter(e => e.isMilestone)
)

watch(() => props.milestone, (ms) => {
  if (ms) {
    form.title         = ms.title
    form.milestoneDate = ms.milestoneDate ?? ''
    form.icon          = ms.icon ?? ''
    form.description   = ms.description ?? ''
    form.eventId       = ms.eventId ?? ''
  } else {
    Object.assign(form, { title: '', milestoneDate: '', icon: '', description: '', eventId: '' })
  }
}, { immediate: true })

function formatEventDate(date: string | null) {
  if (!date) return '日期未知'
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function handleSubmit() {
  errors.title = form.title.trim() ? '' : '请填写节点标题'
  if (errors.title) return

  submitting.value = true
  try {
    const payload = {
      title:         form.title.trim(),
      milestoneDate: form.milestoneDate || undefined,
      icon:          form.icon || undefined,
      description:   form.description || undefined,
      eventId:       form.eventId || undefined,
    }

    if (isEdit.value && props.milestone) {
      await msStore.updateMilestone(props.cpId, props.milestone.id, payload)
      toast.success('已更新 ✓')
    } else {
      await msStore.createMilestone(props.cpId, payload)
      toast.success('节点已添加')
    }

    emit('update:visible', false)
    emit('saved')
  } catch (err) {
    toast.error(err instanceof ApiClientError ? err.message : '操作失败')
  } finally {
    submitting.value = false
  }
}
</script>
