<template>
  <Modal :visible="visible" title="创建关系档案" @update:visible="$emit('update:visible', $event)">
    <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <Input v-model="form.name" label="关系名称" placeholder="例：双北" required :error="errors.name" />
      <Input v-model="form.subtitle" label="关联对象" placeholder="例：撤贝宁 &amp; 何炱" />
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-[var(--color-text-body)]">简介</label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="用一句话描述这段关系…"
          class="w-full px-4 py-2.5 rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] text-sm outline-none transition-colors focus:border-[var(--color-primary)] resize-none placeholder:text-[var(--color-text-disabled)]"
        />
      </div>
      <!-- 封面图上传 -->
      <CoverUpload v-model="form.coverUrl" label="封面图（可选）" />
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
      <Button :loading="submitting" @click="handleSubmit">创建</Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import Modal from '@/components/base/Modal.vue'
import Input from '@/components/base/Input.vue'
import Button from '@/components/base/Button.vue'
import CoverUpload from '@/components/base/CoverUpload.vue'
import { useCpStore } from '@/stores/cp'
import { useToast } from '@/composables/useToast'
import { ApiClientError } from '@/api/client'

defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [v: boolean]; created: [] }>()

const cpStore = useCpStore()
const toast = useToast()
const submitting = ref(false)

const form = reactive({ name: '', subtitle: '', description: '', visibility: 'private', coverUrl: '' })
const errors = reactive({ name: '' })

async function handleSubmit() {
  errors.name = form.name.trim() ? '' : '请输入关系名称'
  if (errors.name) return

  submitting.value = true
  try {
    await cpStore.createCp({
      name:        form.name.trim(),
      subtitle:    form.subtitle || undefined,
      description: form.description || undefined,
      visibility:  form.visibility,
      coverUrl:    form.coverUrl || undefined,
    })
    toast.success('档案已创建')
    emit('update:visible', false)
    emit('created')
    Object.assign(form, { name: '', subtitle: '', description: '', visibility: 'private', coverUrl: '' })
  } catch (err) {
    toast.error(err instanceof ApiClientError ? err.message : '创建失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>
