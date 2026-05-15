<template>
  <div class="min-h-screen bg-[var(--color-bg-page)]">
    <!-- 顶部导航 -->
    <DetailNav :cp-id="cpId" :cp="cpStore.current">
      <template #actions>
        <button
          v-if="can('cp:create')"
          class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
          @click="showEditModal = true"
        >编辑</button>
      </template>
    </DetailNav>

    <!-- CP Banner -->
    <CpBanner :cp="cpStore.current" />

    <!-- 加载中 -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Tab 内容区 -->
    <RouterView v-else :cp="cpStore.current" :cp-id="cpId" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCpStore } from '@/stores/cp'
import { usePermission } from '@/composables/usePermission'
import { useThemeStore } from '@/stores/theme'
import DetailNav from '@/components/layout/DetailNav.vue'
import CpBanner from '@/components/cp/CpBanner.vue'

const route = useRoute()
const cpStore = useCpStore()
const themeStore = useThemeStore()
const { can } = usePermission()

const cpId = route.params.id as string
const loading = ref(false)
const showEditModal = ref(false)

// 将 cp 注入子组件
provide('currentCpId', cpId)

async function loadCp(id: string) {
  loading.value = true
  try {
    const cp = await cpStore.fetchById(id)
    // 进入 CP 页面时应用 CP 专属主题
    themeStore.applyCpTheme(cp.themeConfig as Record<string, unknown> | null)
  } finally {
    loading.value = false
  }
}

// 路由参数变化时重新加载（虽然当前没有动态切换 CP 的场景，但保持健壮性）
watch(() => route.params.id as string, (newId) => {
  if (newId && newId !== cpStore.current?.id) {
    loadCp(newId)
  }
})

onMounted(() => {
  // 若列表中已有数据则可以立即渲染，同时后台刷新
  if (!cpStore.current || cpStore.current.id !== cpId) {
    loadCp(cpId)
  }
})

onUnmounted(() => {
  // 离开时恢复全局主题，清空 currentCp
  themeStore.resetToGlobal()
  cpStore.current = null
})
</script>
