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
      @add-event="openCreateModal"
      @edit="openEditModal"
      @deleted="onDeleted"
      @milestone-toggled="onMilestoneToggled"
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useEventStore } from '@/stores/event'
import { useEvent } from '@/composables/useEvent'
import { usePermission } from '@/composables/usePermission'
import Button from '@/components/base/Button.vue'
import Timeline from '@/components/timeline/Timeline.vue'
import QuickInput from '@/components/timeline/QuickInput.vue'
import EventFormModal from '@/components/timeline/EventFormModal.vue'
import type { CpItem, EventItem } from '@/types'

const props = defineProps<{ cp?: CpItem | null; cpId: string }>()

const route      = useRoute()
const eventStore = useEventStore()
const { toggleMilestone } = useEvent(props.cpId)
const { can }    = usePermission()

const showQuickInput = ref(false)
const showFormModal  = ref(false)
const editingEvent   = ref<EventItem | null>(null)
const filterKeyword  = ref('')
const activeImportance = ref<string>('')
const order          = ref<'asc' | 'desc'>('desc')

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

function onDeleted(_id: string) {
  // store 已处理，无需额外操作
}

function onMilestoneToggled(id: string, value: boolean) {
  toggleMilestone(id, value)
}

function onQuickSaved() {
  // 快速录入保存后轻振感反馈，不需要重新加载（store 已更新）
}

function onEventSaved() {
  showFormModal.value = false
  editingEvent.value = null
}

// 支持从大事记页跳转并高亮某事件
const jumpEventId = computed(() => route.query.eventId as string | undefined)
watch(jumpEventId, (id) => {
  if (id) eventStore.selectEvent(id)
})

onMounted(async () => {
  await eventStore.fetchList(props.cpId, { order: 'desc' })
  if (jumpEventId.value) eventStore.selectEvent(jumpEventId.value)
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
