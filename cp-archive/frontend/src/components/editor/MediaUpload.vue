<template>
  <div>
    <!-- 拖放区域 -->
    <div
      class="border-2 border-dashed rounded-[var(--radius-card)] p-8 text-center transition-colors cursor-pointer"
      :class="isDragging
        ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)]'
        : 'border-[var(--color-border-input)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)]'"
      @click="triggerPick"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <div v-if="!uploading">
        <div class="text-3xl mb-2">🖼</div>
        <p class="text-sm text-[var(--color-text-secondary)]">拖放图片到此处，或点击选择</p>
        <p class="text-xs text-[var(--color-text-disabled)] mt-1">支持 JPG / PNG / WebP / GIF，最大 10MB</p>
      </div>
      <div v-else class="flex flex-col items-center gap-2">
        <div class="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        <div class="w-40 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div class="h-full bg-[var(--color-primary)] rounded-full transition-all" :style="{ width: progress + '%' }" />
        </div>
        <span class="text-xs text-[var(--color-text-secondary)]">上传中 {{ progress }}%</span>
      </div>
    </div>

    <!-- 隐藏 input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      class="hidden"
      @change="onFilePicked"
    />

    <!-- 已上传的图片预览 -->
    <div v-if="uploaded.length" class="grid grid-cols-4 gap-2 mt-3">
      <div
        v-for="m in uploaded"
        :key="m.id"
        class="relative aspect-square rounded-[var(--radius-card)] overflow-hidden bg-[var(--color-bg-page)] group"
      >
        <img :src="m.thumbUrl ?? m.url ?? ''" class="w-full h-full object-cover" />
        <button
          class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          @click="removeUploaded(m.id)"
        >×</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { mediaApi, type MediaRecord } from '@/api/media'
import { useToast } from '@/composables/useToast'

const emit = defineEmits<{
  uploaded: [media: MediaRecord]
  removed:  [id: string]
}>()

const toast       = useToast()
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging  = ref(false)
const uploading   = ref(false)
const progress    = ref(0)
const uploaded    = ref<MediaRecord[]>([])

function triggerPick() {
  fileInputRef.value?.click()
}

async function processFiles(files: FileList | File[]) {
  const list = Array.from(files).filter(f => f.type.startsWith('image/'))
  if (!list.length) return

  uploading.value = true
  progress.value  = 0

  for (const file of list) {
    try {
      const res = await mediaApi.upload(file, (pct) => { progress.value = pct })
      const m = res.data
      uploaded.value.push(m)
      emit('uploaded', m)
    } catch {
      toast.error(`${file.name} 上传失败`)
    }
  }

  uploading.value = false
  progress.value  = 0
}

function onFilePicked(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) processFiles(files)
  ;(e.target as HTMLInputElement).value = ''
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files) processFiles(e.dataTransfer.files)
}

function removeUploaded(id: string) {
  uploaded.value = uploaded.value.filter(m => m.id !== id)
  emit('removed', id)
}
</script>
