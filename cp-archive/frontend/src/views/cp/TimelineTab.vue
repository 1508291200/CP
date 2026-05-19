<template>
  <div class="max-w-5xl mx-auto px-6 py-6">
    <!-- 工具栏 -->
    <div class="flex items-center gap-3 mb-6 flex-wrap">
      <!-- 关键词搜索 -->
      <div class="relative flex-1 min-w-[180px] max-w-xs">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-disabled)] text-xs">🔍</span>
        <input
          v-model="filterKeyword"
          placeholder="搜索事件"
          class="w-full pl-8 pr-3 py-2 text-sm rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-card)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
          @input="onFilterChange"
        />
      </div>

      <!-- 重要性筛选 -->
      <div class="flex gap-1">
        <button
          v-for="opt in importanceOptions"
          :key="opt.value"
          class="px-2.5 py-1 text-xs rounded-[var(--radius-btn)] border transition-all"
          :class="activeImportance === opt.value
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
            : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'"
          @click="toggleImportance(opt.value)"
        >{{ opt.label }}</button>
      </div>

      <!-- 排序切换 -->
      <button
        class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] border border-[var(--color-border)] px-2.5 py-1 rounded-[var(--radius-btn)] transition-colors"
        @click="toggleOrder"
      >{{ order === 'desc' ? '↓ 倒序' : '↑ 正序' }}</button>

      <!-- 批量模式切换 -->
      <button
        v-if="can('event:edit:own')"
        class="text-xs border px-2.5 py-1 rounded-[var(--radius-btn)] transition-colors"
        :class="batchMode
          ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'"
        @click="toggleBatchMode"
      >☑ 批量</button>

      <!-- 新增按钮 -->
      <div class="flex gap-2 ml-auto">
        <Button v-if="can('event:create')" size="sm" variant="ghost" @click="showQuickInput = !showQuickInput">
          ⚡ 快速录入
        </Button>
        <Button v-if="can('event:create')" size="sm" @click="openCreateModal">
          + 新增事件
        </Button>
      </div>
    </div>

    <!-- 批量操作工具栏 -->
    <Transition name="slide-down">
      <div
        v-if="batchMode"
        class="flex items-center gap-3 mb-4 px-4 py-2.5 rounded-[var(--radius-card)] bg-[var(--color-primary-bg)] border border-[var(--color-primary)] flex-wrap"
      >
        <span class="text-xs text-[var(--color-primary)] font-medium">
          已选 {{ selectedIds.size }} 条
        </span>
        <button class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" @click="selectAll">全选</button>
        <button class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]" @click="selectedIds.clear()">取消</button>

        <div class="flex items-center gap-2 ml-auto flex-wrap">
          <!-- 批量设置重要性 -->
          <select
            v-model="batchImportance"
            class="text-xs border border-[var(--color-border)] rounded-[var(--radius-input)] px-2 py-1 bg-[var(--color-bg-card)] text-[var(--color-text-body)]"
          >
            <option value="">设置重要性…</option>
            <option v-for="opt in importanceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <Button size="sm" :disabled="!selectedIds.size || !batchImportance" @click="executeBatchImportance">确认</Button>
          <Button size="sm" variant="ghost" :disabled="!selectedIds.size" class="text-[var(--color-danger)]!" @click="executeBatchDelete">删除选中</Button>
        </div>
      </div>
    </Transition>

    <!-- 已激活的筛选条件 badge -->
    <div v-if="activeFilters.length" class="flex gap-2 mb-4 flex-wrap">
      <span
        v-for="f in activeFilters"
        :key="f.key"
        class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-[var(--radius-tag)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]"
      >
        {{ f.label }}
        <button class="hover:text-[var(--color-danger)]" @click="clearFilter(f.key)">×</button>
      </span>
      <button class="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]" @click="clearAllFilters">清空筛选</button>
    </div>

    <!-- 快速录入条 -->
    <Transition name="slide-down">
      <QuickInput
        v-if="showQuickInput && can('event:create')"
        :cp-id="cpId"
        class="mb-4"
        @saved="onQuickSaved"
        @expand="openCreateModal"
        @close="showQuickInput = false"
      />
    </Transition>

    <!-- 加载骨架屏 -->
    <div v-if="eventStore.loading && !events.length" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-14 rounded-[var(--radius-card)] bg-[var(--color-bg-card)] animate-pulse" />
    </div>

    <!-- 时间轴 -->
    <Timeline
      v-else
      :events="events"
      :cp-id="cpId"
      :can-create="can('event:create')"
      :batch-mode="batchMode"
      :selected-ids="selectedIds"
      @add-event="openCreateModal"
      @edit="openEditModal"
      @deleted="onDeleted"
      @milestone-toggled="onMilestoneToggled"
      @toggle-select="toggleSelect"
      @show-history="openVersionDrawer"
    />
  </div>

  <!-- 完整事件编辑器弹窗 -->
  <EventFormModal
    v-if="showFormModal"
    v-model:visible="showFormModal"
    :cp-id="cpId"
    :event="editingEvent"
    @saved="onEventSaved"
  />

  <!-- 版本历史抽屉 -->
  <VersionDrawer
    v-if="versionEventId"
    :visible="showVersionDrawer"
    :cp-id="cpId"
    :event-id="versionEventId"
    @close="showVersionDrawer = false"
    @restored="onVersionRestored"
  />
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useEventStore } from '@/stores/event'
import { useEvent } from '@/composables/useEvent'
import { usePermission } from '@/composables/usePermission'
import { useToast } from '@/composables/useToast'
import { eventApi } from '@/api/event'
import Button from '@/components/base/Button.vue'
import Timeline from '@/components/timeline/Timeline.vue'
import QuickInput from '@/components/timeline/QuickInput.vue'
import EventFormModal from '@/components/timeline/EventFormModal.vue'
import VersionDrawer from '@/components/timeline/VersionDrawer.vue'
import type { CpItem, EventItem } from '@/types'

const props = defineProps<{ cp?: CpItem | null; cpId: string }>()

const route      = useRoute()
const eventStore = useEventStore()
const { toggleMilestone } = useEvent(props.cpId)
const { can }    = usePermission()
const toast      = useToast()

const showQuickInput = ref(false)
const showFormModal  = ref(false)
const editingEvent   = ref<EventItem | null>(null)
const filterKeyword  = ref('')
const activeImportance = ref<string>('')
const order          = ref<'asc' | 'desc'>('desc')

// ── 批量模式 ─────────────────────────────────────────────
const batchMode      = ref(false)
const selectedIds    = reactive(new Set<string>())
const batchImportance = ref('')

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  if (!batchMode.value) {
    selectedIds.clear()
    batchImportance.value = ''
  }
}

function toggleSelect(id: string) {
  if (selectedIds.has(id)) selectedIds.delete(id)
  else selectedIds.add(id)
}

function selectAll() {
  events.value.forEach(e => selectedIds.add(e.id))
}

async function executeBatchImportance() {
  if (!selectedIds.size || !batchImportance.value) return
  try {
    await eventApi.batchUpdate(props.cpId, {
      ids: [...selectedIds],
      importance: batchImportance.value,
    })
    await eventStore.fetchList(props.cpId, { order: order.value })
    toast.success(`已批量设置 ${selectedIds.size} 条`)
    selectedIds.clear()
    batchImportance.value = ''
  } catch {
    toast.error('批量操作失败')
  }
}

async function executeBatchDelete() {
  if (!selectedIds.size) return
  if (!confirm(`确认删除选中的 ${selectedIds.size} 条事件？`)) return
  try {
    await eventApi.batchDelete(props.cpId, [...selectedIds])
    await eventStore.fetchList(props.cpId, { order: order.value })
    toast.success('批量删除成功')
    selectedIds.clear()
  } catch {
    toast.error('批量删除失败')
  }
}

// ── 版本历史 ─────────────────────────────────────────────
const showVersionDrawer = ref(false)
const versionEventId    = ref('')

function openVersionDrawer(event: EventItem) {
  versionEventId.value    = event.id
  showVersionDrawer.value = true
}

async function onVersionRestored() {
  showVersionDrawer.value = false
  await eventStore.fetchList(props.cpId, { order: order.value })
}

// ── 筛选 ─────────────────────────────────────────────────
const importanceOptions = [
  { value: 'critical', label: '核心' },
  { value: 'high',     label: '重要' },
  { value: 'medium',   label: '一般' },
  { value: 'normal',   label: '普通' },
]

const events = computed(() => {
  let list = eventStore.getEvents(props.cpId)

  if (activeImportance.value) {
    list = list.filter(e => e.importance === activeImportance.value)
  }
  if (filterKeyword.value.trim()) {
    const kw = filterKeyword.value.trim().toLowerCase()
    list = list.filter(e => e.title.toLowerCase().includes(kw) || (e.summary ?? '').toLowerCase().includes(kw))
  }
  return list
})

const activeFilters = computed(() => {
  const f: Array<{ key: string; label: string }> = []
  if (activeImportance.value) {
    const opt = importanceOptions.find(o => o.value === activeImportance.value)
    if (opt) f.push({ key: 'importance', label: `重要性: ${opt.label}` })
  }
  if (filterKeyword.value.trim()) {
    f.push({ key: 'keyword', label: `关键词: ${filterKeyword.value}` })
  }
  return f
})

function toggleImportance(val: string) {
  activeImportance.value = activeImportance.value === val ? '' : val
}

function clearFilter(key: string) {
  if (key === 'importance') activeImportance.value = ''
  if (key === 'keyword')    filterKeyword.value = ''
}

function clearAllFilters() {
  activeImportance.value = ''
  filterKeyword.value    = ''
}

let debounce: ReturnType<typeof setTimeout>
function onFilterChange() {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    eventStore.setFilters(props.cpId, {
      keyword:    filterKeyword.value || undefined,
      importance: activeImportance.value || undefined,
      order:      order.value,
    })
  }, 300)
}

function toggleOrder() {
  order.value = order.value === 'desc' ? 'asc' : 'desc'
  eventStore.setFilters(props.cpId, { order: order.value })
}

function openCreateModal() {
  editingEvent.value = null
  showFormModal.value = true
  showQuickInput.value = false
}

function openEditModal(event: EventItem) {
  editingEvent.value = event
  showFormModal.value = true
}

function onDeleted(_id: string) {}

function onMilestoneToggled(id: string, value: boolean) {
  toggleMilestone(id, value)
}

function onQuickSaved() {}

function onEventSaved() {
  showFormModal.value = false
  editingEvent.value = null
}

// 支持从大事记页跳转并高亮某事件
const highlightEventId = ref<string>('')
const jumpEventId = computed(() => route.query.eventId as string | undefined)

async function scrollToEvent(id: string) {
  highlightEventId.value = id
  await nextTick()
  const el = document.querySelector(`[data-event-id="${id}"]`) as HTMLElement | null
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => { highlightEventId.value = '' }, 2000)
  }
}

watch(jumpEventId, async (id) => {
  if (id) {
    eventStore.selectEvent(id)
    await scrollToEvent(id)
  }
})

onMounted(async () => {
  await eventStore.fetchList(props.cpId, { order: 'desc' })
  if (jumpEventId.value) {
    eventStore.selectEvent(jumpEventId.value)
    await scrollToEvent(jumpEventId.value)
  }
})
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--duration-normal) var(--easing-out);
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
