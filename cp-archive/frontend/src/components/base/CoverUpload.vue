<template>
  <!-- 圆形头像上传区 -->
  <div class="flex flex-col items-center gap-3">
    <label class="text-sm font-medium text-[var(--color-text-body)] self-start">{{ label }}</label>

    <div
      class="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-[var(--color-border-input)] bg-[var(--color-bg-page)] cursor-pointer hover:border-[var(--color-primary)] transition-colors flex-shrink-0"
      :class="{ 'border-solid border-[var(--color-border)]': currentUrl }"
      @click="triggerInput"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <img v-if="currentUrl" :src="currentUrl" class="w-full h-full object-cover" />
      <div v-else-if="uploading" class="w-full h-full flex items-center justify-center">
        <span class="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
      <div v-else class="w-full h-full flex flex-col items-center justify-center gap-1">
        <span class="text-2xl">👤</span>
        <span class="text-[10px] text-[var(--color-text-secondary)] leading-tight text-center px-1">点击上传</span>
      </div>
      <div
        v-if="currentUrl"
        class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1"
      >
        <span class="text-white text-xs">更换</span>
      </div>
    </div>

    <button
      v-if="currentUrl"
      type="button"
      class="text-xs text-[var(--color-danger)] hover:underline"
      @click.stop="clearImage"
    >移除头像</button>

    <div v-if="uploading" class="w-24 h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
      <div class="h-full bg-[var(--color-primary)] transition-all duration-300" :style="{ width: progress + '%' }" />
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { mediaApi } from '@/api/media'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  label?: string
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [url: string]
}>()

const toast     = useToast()
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const progress  = ref(0)

const currentUrl = ref(props.modelValue ?? '')
watch(() => props.modelValue, (val) => {
  currentUrl.value = val ?? ''
})

function triggerInput() {
  if (!uploading.value) fileInput.value?.click()
}

function clearImage() {
  currentUrl.value = ''
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
    currentUrl.value = url
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
  ;(e.target as HTMLInputElement).value = ''
}

function onDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (file) uploadFile(file)
}
</script>
