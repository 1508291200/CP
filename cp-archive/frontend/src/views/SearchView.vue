<template>
  <div class="min-h-screen bg-[var(--color-bg-page)]">
    <!-- 顶部搜索栏 -->
    <div class="sticky top-0 z-40 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] shadow-[var(--shadow-card)]">
      <div class="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
        <button
          class="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors flex-shrink-0"
          @click="router.back()"
        >← 返回</button>

        <div class="relative flex-1">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-disabled)] text-sm">🔍</span>
          <input
            ref="inputRef"
            v-model="keyword"
            placeholder="搜索 CP、事件、里程碑、人物…"
            class="w-full pl-9 pr-4 py-2 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)] transition-colors"
            @input="onInput"
            @keydown.escape="router.back()"
          />
          <button
            v-if="keyword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-disabled)] hover:text-[var(--color-danger)]"
            @click="keyword = ''; result = null"
          >×</button>
        </div>

        <!-- CP 范围过滤提示 -->
        <div v-if="cpIdFilter" class="flex-shrink-0 flex items-center gap-1 text-xs text-[var(--color-primary)] bg-[var(--color-primary-bg)] px-2 py-1 rounded">
          <span>当前 CP</span>
          <button class="hover:text-[var(--color-danger)]" @click="cpIdFilter = ''; doSearch()">×</button>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-6 py-6">
      <!-- 初始提示 -->
      <div v-if="!keyword.trim() && !result" class="text-center py-20">
        <div class="text-5xl mb-4">🔍</div>
        <p class="text-[var(--color-text-secondary)]">输入关键词搜索所有内容</p>
        <p class="text-xs text-[var(--color-text-disabled)] mt-2">支持搜索 CP 名称、事件标题/摘要、里程碑、人物</p>
      </div>

      <!-- 加载中 -->
      <div v-else-if="loading" class="space-y-3">
        <div v-for="i in 6" :key="i" class="h-16 rounded-[var(--radius-card)] bg-[var(--color-bg-card)] animate-pulse" />
      </div>

      <!-- 无结果 -->
      <div v-else-if="result && !result.hits.length" class="text-center py-20">
        <div class="text-4xl mb-3">😶</div>
        <p class="text-[var(--color-text-secondary)]">未找到「{{ result.query }}」的相关内容</p>
      </div>

      <!-- 搜索结果 -->
      <template v-else-if="result">
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm text-[var(--color-text-secondary)]">
            找到 <strong class="text-[var(--color-text-title)]">{{ result.total }}</strong> 条结果
          </span>
          <!-- 类型筛选 -->
          <div class="flex gap-1">
            <button
              v-for="tab in TYPE_TABS"
              :key="tab.value"
              class="px-2.5 py-1 text-xs rounded-[var(--radius-btn)] border transition-all"
              :class="activeType === tab.value
                ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'"
              @click="activeType = activeType === tab.value ? null : tab.value"
            >{{ tab.label }}</button>
          </div>
        </div>

        <!-- 结果列表 -->
        <div class="space-y-2">
          <button
            v-for="hit in filteredHits"
            :key="hit.id"
            class="w-full text-left bg-[var(--color-bg-card)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] px-4 py-3 hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 transition-all"
            @click="navigateTo(hit)"
          >
            <div class="flex items-start gap-3">
              <!-- 类型图标 -->
              <span class="flex-shrink-0 text-lg mt-0.5">{{ TYPE_ICON[hit.type] }}</span>

              <div class="flex-1 min-w-0">
                <!-- 标题 -->
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-[var(--color-text-title)]" v-html="highlight(hit.title)" />
                  <span class="text-xs text-[var(--color-text-disabled)] bg-[var(--color-bg-page)] px-1.5 py-0.5 rounded flex-shrink-0">
                    {{ TYPE_LABEL[hit.type] }}
                  </span>
                </div>
                <!-- 副标题 -->
                <div v-if="hit.subtitle" class="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {{ hit.subtitle }}
                </div>
                <!-- 摘要高亮 -->
                <div v-if="hit.highlight" class="text-xs text-[var(--color-text-disabled)] mt-1 line-clamp-2" v-html="highlight(hit.highlight)" />
              </div>

              <span class="flex-shrink-0 text-[var(--color-text-disabled)] text-xs mt-1">→</span>
            </div>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { searchApi, type SearchResult, type SearchHitType, type SearchHit } from '@/api/search'

const router   = useRouter()
const route    = useRoute()
const inputRef = ref<HTMLInputElement>()
const keyword  = ref((route.query.q as string) ?? '')
const cpIdFilter = ref((route.query.cpId as string) ?? '')
const result   = ref<SearchResult | null>(null)
const loading  = ref(false)
const activeType = ref<SearchHitType | null>(null)

const TYPE_TABS = [
  { value: 'cp'        as SearchHitType, label: 'CP' },
  { value: 'event'     as SearchHitType, label: '事件' },
  { value: 'milestone' as SearchHitType, label: '里程碑' },
  { value: 'character' as SearchHitType, label: '人物' },
]

const TYPE_ICON: Record<SearchHitType, string> = {
  cp:        '💕',
  event:     '📅',
  milestone: '🌟',
  character: '👤',
}
const TYPE_LABEL: Record<SearchHitType, string> = {
  cp:        'CP',
  event:     '事件',
  milestone: '里程碑',
  character: '人物',
}

const filteredHits = computed(() => {
  if (!result.value) return []
  if (!activeType.value) return result.value.hits
  return result.value.hits.filter(h => h.type === activeType.value)
})

let debounceTimer: ReturnType<typeof setTimeout>

function onInput() {
  clearTimeout(debounceTimer)
  if (!keyword.value.trim()) { result.value = null; return }
  debounceTimer = setTimeout(doSearch, 300)
}

async function doSearch() {
  const q = keyword.value.trim()
  if (!q) return

  // 同步 URL query 参数
  const query: Record<string, string> = { q }
  if (cpIdFilter.value) query.cpId = cpIdFilter.value
  router.replace({ query })

  loading.value = true
  try {
    const res = await searchApi.search(q, cpIdFilter.value || undefined)
    result.value = res.data
    activeType.value = null
  } catch {
    result.value = null
  } finally {
    loading.value = false
  }
}

function navigateTo(hit: SearchHit) {
  router.push(hit.url)
}

// 关键词高亮（在结果文字中用 mark 标签包裹匹配部分）
function highlight(text: string): string {
  if (!keyword.value.trim()) return text
  const escaped = keyword.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(
    new RegExp(escaped, 'gi'),
    m => `<mark class="bg-yellow-200/70 dark:bg-yellow-700/40 rounded px-0.5">${m}</mark>`,
  )
}

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
  // 如果 URL 中有 q 参数，立即搜索
  if (keyword.value.trim()) doSearch()
})
</script>
