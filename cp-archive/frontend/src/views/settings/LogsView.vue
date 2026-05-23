<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-[var(--color-text-title)]">操作日志</h2>
      <span class="text-xs text-[var(--color-text-disabled)]">共 {{ meta?.total ?? 0 }} 条记录</span>
    </div>

    <!-- 筛选栏 -->
    <div class="flex gap-3 flex-wrap">
      <input
        v-model="filterAction"
        placeholder="按操作类型搜索…"
        class="flex-1 min-w-[160px] px-3 py-1.5 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
        @input="onFilterChange"
      />
      <select
        v-model="filterResourceType"
        class="px-3 py-1.5 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-page)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
        @change="load(1)"
      >
        <option value="">所有资源类型</option>
        <option value="cp">CP</option>
        <option value="event">事件</option>
        <option value="user">用户</option>
        <option value="milestone">里程碑</option>
        <option value="media">媒体</option>
      </select>
      <button
        class="px-3 py-1.5 text-sm rounded-[var(--radius-btn)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
        @click="clearFilters"
      >清空筛选</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 8" :key="i" class="h-14 rounded-[var(--radius-card)] bg-[var(--color-bg-card)] animate-pulse" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="!logs.length" class="text-center py-16">
      <div class="text-4xl mb-3">📋</div>
      <p class="text-[var(--color-text-secondary)]">暂无操作日志</p>
    </div>

    <!-- 日志列表 -->
    <div v-else class="space-y-1.5">
      <div
        v-for="log in logs"
        :key="log.id"
        class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] px-4 py-3 shadow-[var(--shadow-card)] group"
      >
        <div class="flex items-start gap-3">
          <!-- 操作类型标签 -->
          <span
            class="flex-shrink-0 mt-0.5 px-2 py-0.5 text-xs rounded font-mono"
            :class="actionClass(log.action)"
          >{{ log.action }}</span>

          <!-- 主内容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm text-[var(--color-text-body)]">
                {{ log.displayName || log.username || '系统' }}
              </span>
              <span v-if="log.resourceType" class="text-xs text-[var(--color-text-disabled)] bg-[var(--color-bg-page)] px-1.5 py-0.5 rounded">
                {{ log.resourceType }}
              </span>
            </div>

            <!-- 详情（可展开） -->
            <div v-if="log.detail && Object.keys(log.detail).length" class="mt-1">
              <button
                class="text-xs text-[var(--color-text-disabled)] hover:text-[var(--color-primary)] transition-colors"
                @click="toggleDetail(log.id)"
              >
                {{ expandedIds.has(log.id) ? '▲ 收起详情' : '▼ 查看详情' }}
              </button>
              <pre
                v-if="expandedIds.has(log.id)"
                class="mt-1 p-2 text-xs bg-[var(--color-bg-page)] rounded border border-[var(--color-border)] overflow-auto max-h-40 text-[var(--color-text-body)]"
              >{{ JSON.stringify(log.detail, null, 2) }}</pre>
            </div>
          </div>

          <!-- 时间 + IP -->
          <div class="flex-shrink-0 text-right">
            <div class="text-xs text-[var(--color-text-disabled)]">{{ formatDate(log.createdAt) }}</div>
            <div v-if="log.ip" class="text-xs text-[var(--color-text-disabled)] opacity-60">{{ log.ip }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="meta && meta.totalPages > 1" class="flex items-center justify-center gap-2 pt-2">
      <button
        class="px-3 py-1 text-sm rounded-[var(--radius-btn)] border border-[var(--color-border)] disabled:opacity-40 hover:border-[var(--color-primary)] transition-colors"
        :disabled="page <= 1"
        @click="load(page - 1)"
      >上一页</button>
      <span class="text-sm text-[var(--color-text-secondary)]">{{ page }} / {{ meta.totalPages }}</span>
      <button
        class="px-3 py-1 text-sm rounded-[var(--radius-btn)] border border-[var(--color-border)] disabled:opacity-40 hover:border-[var(--color-primary)] transition-colors"
        :disabled="page >= meta.totalPages"
        @click="load(page + 1)"
      >下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listLogs, type OperationLog, type LogListResult } from '@/api/user'

const logs    = ref<OperationLog[]>([])
const meta    = ref<LogListResult['meta'] | null>(null)
const loading = ref(false)
const page    = ref(1)
const filterAction       = ref('')
const filterResourceType = ref('')
const expandedIds        = ref(new Set<string>())

let debounceTimer: ReturnType<typeof setTimeout>

async function load(p = 1) {
  loading.value = true
  page.value = p
  try {
    const res = await listLogs({
      page:         p,
      limit:        50,
      action:       filterAction.value || undefined,
      resourceType: filterResourceType.value || undefined,
    })
    logs.value = res.data.items
    meta.value = res.data.meta
  } finally {
    loading.value = false
  }
}

function onFilterChange() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 300)
}

function clearFilters() {
  filterAction.value       = ''
  filterResourceType.value = ''
  load(1)
}

function toggleDetail(id: string) {
  if (expandedIds.value.has(id)) expandedIds.value.delete(id)
  else expandedIds.value.add(id)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 根据操作类型给不同颜色
function actionClass(action: string) {
  if (action.includes('delete') || action.includes('remove') || action.includes('deactivat')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }
  if (action.includes('create') || action.includes('register') || action.includes('joined')) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }
  if (action.includes('update') || action.includes('edit') || action.includes('role')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }
  return 'bg-[var(--color-bg-page)] text-[var(--color-text-secondary)]'
}

onMounted(() => load())
</script>
