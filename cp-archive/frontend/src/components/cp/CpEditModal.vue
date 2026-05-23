<template>
  <Modal :visible="visible" title="编辑 CP 信息" @update:visible="$emit('update:visible', $event)">
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <Input v-model="form.name" label="CP 名称" placeholder="例：黎明将至" required :error="errors.name" />
      <Input v-model="form.subtitle" label="人物组合" placeholder="例：陆知行 × 顾深" />
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">简介</label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="用一句话描述这对 CP 的故事..."
          class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] resize-none placeholder:text-[var(--color-text-disabled)]"
        />
      </div>
      <!-- 封面图 -->
      <CoverUpload v-model="form.coverUrl" label="封面图（小方图，显示在 Banner 左侧）" />
      <!-- Banner 横图 -->
      <CoverUpload v-model="form.bannerUrl" label="Banner 横图（可选，用作页面背景）" />
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">可见性</label>
        <select
          v-model="form.visibility"
          class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)]"
        >
          <option value="private">仅自己</option>
          <option value="members">站内成员</option>
          <option value="public">公开</option>
        </select>
      </div>
    </form>
    <template #footer>
      <Button variant="ghost" @click="$emit('update:visible', false)">取消</Button>
      <Button :loading="submitting" @click="handleSubmit">保存</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import Modal from '@/components/base/Modal.vue'
import Input from '@/components/base/Input.vue'
import Button from '@/components/base/Button.vue'
import CoverUpload from '@/components/base/CoverUpload.vue'
import { useCpStore } from '@/stores/cp'
import { useToast } from '@/composables/useToast'
import { ApiClientError } from '@/api/client'
import type { CpItem } from '@/types'

const props = defineProps<{
  visible: boolean
  cp: CpItem
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
  saved: []
}>()

const cpStore = useCpStore()
const toast = useToast()
const submitting = ref(false)

const form = reactive({
  name:        '',
  subtitle:    '',
  description: '',
  visibility:  'private',
  coverUrl:    '',
  bannerUrl:   '',
})
const errors = reactive({ name: '' })

// 每次弹窗打开时，将 cp 数据填入 form
watch(
  () => props.visible,
  (open) => {
    if (open && props.cp) {
      form.name        = props.cp.name        ?? ''
      form.subtitle    = props.cp.subtitle    ?? ''
      form.description = props.cp.description ?? ''
      form.visibility  = props.cp.visibility  ?? 'private'
      form.coverUrl    = props.cp.coverUrl    ?? ''
      form.bannerUrl   = props.cp.bannerUrl   ?? ''
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  errors.name = form.name.trim() ? '' : '请输入 CP 名称'
  if (errors.name) return

  submitting.value = true
  try {
    await cpStore.updateCp(props.cp.id, {
      name:        form.name.trim(),
      subtitle:    form.subtitle   || undefined,
      description: form.description || undefined,
      visibility:  form.visibility,
      coverUrl:    form.coverUrl   || undefined,
      bannerUrl:   form.bannerUrl  || undefined,
    })
    toast.success('CP 信息已保存')
    emit('update:visible', false)
    emit('saved')
  } catch (err) {
    toast.error(err instanceof ApiClientError ? err.message : '保存失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>
