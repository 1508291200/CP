<template>
  <nav class="sticky top-0 z-50 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] transition-shadow"
    :class="{ 'shadow-[var(--shadow-card)]': scrolled }"
  >
    <div class="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
      <!-- 左侧：返回 + 标题 -->
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <button
          class="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors text-sm flex-shrink-0"
          @click="router.push('/')"
        >← 返回</button>
        <div v-if="cp" class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="font-semibold text-sm text-[var(--color-text-title)] truncate">{{ cp.name }}</span>
            <span class="text-[var(--color-primary)] text-sm">♡</span>
          </div>
          <p v-if="cp.subtitle" class="text-xs text-[var(--color-text-secondary)] truncate leading-none">
            {{ cp.subtitle }}
          </p>
        </div>
      </div>

      <!-- 中部：Tab 导航 -->
      <div class="flex items-center gap-0 flex-shrink-0">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="`/cp/${cpId}/${tab.to}`"
          class="relative px-4 py-4 text-sm transition-colors"
          :class="isActive(tab.to)
            ? 'text-[var(--color-primary)] font-medium'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-body)]'"
        >
          {{ tab.label }}
          <span
            v-if="isActive(tab.to)"
            class="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--color-primary)]"
          />
        </RouterLink>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <slot name="actions" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { CpItem } from '@/types'

interface Props {
  cpId: string
  cp?: CpItem | null
}

defineProps<Props>()

const router = useRouter()
const route = useRoute()
const scrolled = ref(false)

const tabs = [
  { label: '人物简介', to: 'profile' },
  { label: '时间轴',   to: 'timeline' },
  { label: '大事记',   to: 'milestones' },
]

function isActive(tabTo: string) {
  return route.path.endsWith(tabTo)
}

function onScroll() { scrolled.value = window.scrollY > 0 }
onMounted(() => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>
