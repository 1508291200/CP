<template>
  <!-- 封面图上传区 -->
  <div class="flex flex-col gap-1.5">
    <label class="text-sm font-medium text-[var(--color-text-body)]">{{ label }}</label>

    <!-- 已有预览 -->
    <div v-if="previewUrl" class="relative group w-full h-32 rounded-[var(--radius-card)] overflow-hidden border border-[var(--color-border)]">
      <img :src="previewUrl" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          class="text-white text-xs bg-white/20 hover:bg-white/40 rounded px-2 py-1 transition-colors"
          @click="triggerInput"
        >更换</button>
        <button
          type="button"
          class="text-white text-xs bg-red-500/60 hover:bg-red-500/80 rounded px-2 py-1 transition-colors"
          @click="clearImage"
        >移除</button>
      </div>
    </div>

    <!-- 上传触发区 -->
    <div
      v-else
      class="w-full h-24 rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-border-input)] bg-[var(--color-bg-page)] flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] transition-colors"
      @click="triggerInput"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <span v-if="uploading" class="w-5 h-5 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
      <template v-else>
        <span class="text-xl">🖼️</span>
        <span class="text-xs text-[var(--color-text-secondary)]">点击或拖放上传图片</span>
      </template>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading" class="h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
      <div
        class="h-full bg-[var(--color-primary)] transition-all duration-300"
        :style="{ width: progress + '%' }"
      />
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { mediaApi } from '@/api/media'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  label?: string
  modelValue?: string   // 当前 URL
}>()

const emit = defineEmits<{
  'update:modelValue': [url: string]
}>()

const toast     = useToast()
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const progress  = ref(0)

const previewUrl = ref(props.modelValue ?? '')

function triggerInput() {
  fileInput.value?.click()
}

function clearImage() {
  previewUrl.value = ''
  emit('update:modelValue', '')
}

async function uploadFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.error('仅支持图片格式')
    return
  }
  uploading.value = true
  progress.value = 0
  try {
    const result = await mediaApi.upload(file, (p) => { progress.value = p })
    const url = result.data.url ?? ''
    previewUrl.value = url
    emit('update:modelValue', url)
  } catch {
    toast.error('上传失败，请重试')
  } finally {
    uploading.value = false
    progress.value = 0
  }
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadFile(file)
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) uploadFile(file)
}
</script>
