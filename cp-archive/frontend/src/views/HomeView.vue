<template>
  <div class="min-h-screen bg-[var(--color-bg-page)]">
    <!-- 顶部导航 -->
    <nav class="sticky top-0 z-50 bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
      <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <span class="font-semibold text-base text-[var(--color-text-title)]">CP 档案站</span>
        <div class="flex items-center gap-3">
          <!-- 深色/浅色切换 -->
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-bg)] transition-colors text-base"
            @click="uiStore.toggleDark()"
            :title="uiStore.isDark ? '切换到浅色模式' : '切换到深色模式'"
          >{{ uiStore.isDark ? '☀️' : '🌙' }}</button>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-bg)] transition-colors text-base"
            @click="router.push('/settings/theme')" title="主题设置"
          >🎨</button>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-bg)] transition-colors text-base"
            title="全局搜索" @click="router.push('/search')"
          >🔍</button>
          <NotificationBell />
          <div class="flex items-center gap-2">
            <button
              class="w-7 h-7 rounded-full overflow-hidden bg-[var(--color-primary-bg)] flex items-center justify-center text-xs font-medium text-[var(--color-primary)] flex-shrink-0 hover:ring-2 hover:ring-[var(--color-primary)] transition-all"
              @click="router.push('/settings/profile')" title="个人资料"
            >
              <img v-if="authStore.user?.avatarUrl" :src="authStore.user.avatarUrl" class="w-full h-full object-cover" :alt="authStore.user?.displayName ?? authStore.user?.username" />
              <span v-else>{{ authStore.user?.displayName?.[0] ?? authStore.user?.username?.[0]?.toUpperCase() }}</span>
            </button>
            <button class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors" @click="authStore.logout()">
              退出
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="max-w-5xl mx-auto px-6 py-10">
      <!-- Hero 区 -->
      <div class="text-center mb-10 relative">
        <div class="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <span v-for="i in 8" :key="i" class="absolute text-[var(--color-primary)] opacity-10 text-xl"
            :style="{ left: `${(i * 13) % 100}%`, top: `${(i * 17) % 100}%` }">✦</span>
        </div>
        <h1 class="text-3xl font-bold text-[var(--color-text-title)] mb-2">
          记录每一份<span class="text-[var(--color-primary)]">心动</span>的轨迹
        </h1>
        <p class="text-[var(--color-text-secondary)] text-sm mb-6">你的 CP 时间线收藏站</p>
        <div class="relative max-w-md mx-auto">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-disabled)]">🔍</span>
          <input
            v-model="searchInput"
            placeholder="搜索 CP / 作品 / 人物"
            class="w-full pl-10 pr-4 py-3 rounded-full border border-[var(--color-border-input)] bg-[var(--color-bg-card)] text-[var(--color-text-body)] text-sm outline-none focus:border-[var(--color-primary)] shadow-[var(--shadow-card)] transition-all"
          />
        </div>
      </div>

      <!-- CP 列表区标题 + 创建按钮 -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="font-semibold text-[var(--color-text-title)]">全部 CP</h2>
        <Button v-if="isAdmin" size="sm" @click="showCreateModal = true">+ 创建 CP</Button>
      </div>

      <!-- 加载中：shimmer 骨架屏 -->
      <div v-if="isInitialLoading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div
          v-for="i in 6" :key="i"
          class="rounded-[var(--radius-card)] aspect-[3/4] relative overflow-hidden bg-[var(--color-bg-card)] border border-[var(--color-border)]"
        >
          <div class="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[var(--color-primary-bg)] to-transparent" />
          <div class="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-2">
            <div class="h-4 w-3/4 rounded bg-[var(--color-border)]" />
            <div class="h-3 w-1/2 rounded bg-[var(--color-border)] opacity-60" />
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!cpStore.loading && !cpStore.list.length" class="text-center py-20">
        <div class="text-5xl mb-4">💕</div>
        <p class="text-[var(--color-text-secondary)] mb-4">还没有任何 CP</p>
        <Button v-if="isAdmin" @click="showCreateModal = true">创建第一对 CP</Button>
        <p v-else class="text-sm text-[var(--color-text-disabled)]">暂无内容</p>
      </div>

      <!-- CP 网格 -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <CpCard
          v-for="cp in filteredList" :key="cp.id" :cp="cp"
          @click="router.push(`/cp/${cp.id}/timeline`)"
        />
      </div>

      <div ref="sentinel" class="h-4 mt-8" />
      <div v-if="cpStore.loading && cpStore.list.length" class="flex justify-center py-4">
        <span class="w-5 h-5 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
      </div>
    </div>

    <CreateCpModal v-model:visible="showCreateModal" @created="onCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCpStore } from '@/stores/cp'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { usePermission } from '@/composables/usePermission'
import Button from '@/components/base/Button.vue'
import CpCard from '@/components/cp/CpCard.vue'
import CreateCpModal from '@/components/cp/CreateCpModal.vue'
import NotificationBell from '@/components/layout/NotificationBell.vue'

const router    = useRouter()
const cpStore   = useCpStore()
const authStore = useAuthStore()
const uiStore   = useUIStore()
const { isAdmin } = usePermission()

const showCreateModal  = ref(false)
const searchInput      = ref('')
const currentPage      = ref(1)
const sentinel         = ref<HTMLElement>()

const isInitialLoading = computed(() => cpStore.loading && cpStore.list.length === 0)

let debounceTimer: ReturnType<typeof setTimeout>
watch(searchInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    cpStore.fetchList({ q: val || undefined, page: 1, limit: 20 })
  }, 300)
})

const filteredList = computed(() => cpStore.list)

async function loadMore() {
  if (!cpStore.hasMore || cpStore.loading) return
  currentPage.value++
  await cpStore.fetchList({ q: searchInput.value || undefined, page: currentPage.value, limit: 20 }, true)
}

let observer: IntersectionObserver | null = null
onMounted(() => {
  cpStore.fetchList({ page: 1, limit: 20 })
  observer = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting) loadMore() },
    { rootMargin: '100px' },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})
onUnmounted(() => observer?.disconnect())

function onCreated() {
  currentPage.value = 1
  cpStore.fetchList({ page: 1, limit: 20 })
}
</script>
