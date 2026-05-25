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
      <div class="flex items-center gap-0 flex-shrink-0 overflow-x-auto">
        <RouterLink
          v-for="tab in allTabs"
          :key="tab.to"
          :to="`/cp/${cpId}/${tab.to}`"
          class="relative px-4 py-4 text-sm transition-colors whitespace-nowrap"
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
        <!-- 站内搜索（在当前 CP 范围内） -->
        <button
          class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          title="搜索"
          @click="router.push({ path: '/search', query: { cpId: cpId } })"
        >🔍</button>
        <slot name="actions" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { cpApi, type CpTab } from '@/api/cp'
import type { CpItem } from '@/types'

interface Props {
  cpId: string
  cp?: CpItem | null
}

const props = defineProps<Props>()

const router   = useRouter()
const route    = useRoute()
const scrolled = ref(false)

// 固定 tab
const baseTabs = [
  { label: '人物简介', to: 'profile' },
  { label: '时间轴',   to: 'timeline' },
  { label: '大事记',   to: 'milestones' },
]

// 动态自定义 tab
const customTabs = ref<CpTab[]>([])

async function loadCustomTabs() {
  try {
    const res = await cpApi.listTabs(props.cpId)
    customTabs.value = (res.data ?? []).filter(t => t.isVisible && t.tabType === 'custom')
  } catch {
    customTabs.value = []
  }
}

const allTabs = computed(() => [
  ...baseTabs,
  ...customTabs.value.map(t => ({ label: t.name, to: `custom/${t.id}` })),
])

function isActive(tabTo: string) {
  return route.path.includes(`/${tabTo}`)
}

function onScroll() { scrolled.value = window.scrollY > 0 }
onMounted(() => {
  window.addEventListener('scroll', onScroll)
  loadCustomTabs()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

watch(() => props.cpId, loadCustomTabs)
</script>
