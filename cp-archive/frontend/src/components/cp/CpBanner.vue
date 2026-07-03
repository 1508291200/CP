<template>
  <div
    class="relative overflow-hidden bg-gradient-to-r from-[var(--color-primary-bg)] to-[var(--color-bg-card)] py-8 px-6"
    :style="cp?.bannerUrl ? `background-image: url('${cp.bannerUrl}'); background-size: cover; background-position: center;` : ''"
  >
    <!-- 背景遮罩（有 banner 图时）-->
    <div v-if="cp?.bannerUrl" class="absolute inset-0 bg-black/30" />

    <div class="relative max-w-5xl mx-auto flex items-center gap-4">
      <!-- 封面缩略图 -->
      <div class="w-16 h-16 rounded-[var(--radius-card)] overflow-hidden flex-shrink-0 shadow-[var(--shadow-card)] bg-[var(--color-bg-page)]">
        <img v-if="cp?.coverUrl" :src="cp.coverUrl" :alt="cp.name" class="w-full h-full object-cover" />
        <div v-else class="w-full h-full flex items-center justify-center text-xl text-[var(--color-text-disabled)]">CP</div>
      </div>

      <!-- 标题信息 -->
      <div :class="cp?.bannerUrl ? 'text-white' : ''">
        <h1 class="text-xl font-bold leading-tight mb-0.5">{{ cp?.name }}</h1>
        <p v-if="cp?.subtitle" class="text-sm opacity-80">{{ cp.subtitle }}</p>
        <p v-if="cp?.description" class="text-xs opacity-60 mt-1 max-w-md line-clamp-2">{{ cp.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CpItem } from '@/types'
defineProps<{ cp?: CpItem | null }>()
</script>
