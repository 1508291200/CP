<!--
  EventRelations.vue
  展示/管理某事件的关联事件（显示在 EventDetail 展开区内）
  - 加载并显示所有关联
  - 支持添加新关联（事件搜索 + 类型选择）
  - 支持删除关联
  - 点击关联事件可跳转高亮
-->
<template>
  <div class="mt-3 pt-3 border-t border-[var(--color-border)]">
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs font-medium text-[var(--color-text-secondary)]">🔗 关联事件 ({{ relations.length }})</span>
      <button
        v-if="canInCp(cpId, 'event:edit:own')"
        class="text-xs text-[var(--color-primary)] hover:underline"
        @click="showAdd = !showAdd"
      >{{ showAdd ? '取消' : '+ 添加关联' }}</button>
    </div>

    <!-- 关联列表 -->
    <div v-if="loading" class="text-xs text-[var(--color-text-disabled)]">加载中…</div>

    <div v-else-if="relations.length" class="space-y-1 mb-2">
      <div
        v-for="rel in relations"
        :key="rel.id"
        class="flex items-center gap-2 group"
      >
        <!-- 关系类型标签 -->
        <span class="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
          {{ RELATION_LABELS[rel.relationType] ?? rel.relationType }}
        </span>
        <!-- 事件标题（可跳转） -->
        <button
          class="flex-1 min-w-0 text-left text-xs text-[var(--color-text-body)] hover:text-[var(--color-primary)] truncate transition-colors"
          @click="emit('jump-to-event', rel.event.id)"
        >{{ rel.event.title }}</button>
        <!-- 删除 -->
        <button
          v-if="canInCp(cpId, 'event:edit:own')"
          class="flex-shrink-0 text-xs text-[var(--color-text-disabled)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-danger)] transition-all"
          @click="removeRelation(rel.id)"
        >×</button>
      </div>
    </div>

    <div v-else-if="!showAdd" class="text-xs text-[var(--color-text-disabled)] mb-2">暂无关联事件</div>

    <!-- 添加关联表单 -->
    <Transition name="slide-down">
      <div
        v-if="showAdd"
        class="mt-2 p-3 bg-[var(--color-bg-page)] rounded-[var(--radius-card)] border border-[var(--color-border-input)] space-y-2"
      >
        <!-- 事件搜索 -->
        <div class="relative">
          <input
            v-model="searchKeyword"
            placeholder="搜索事件标题…"
            class="w-full px-3 py-1.5 text-xs rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-card)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
            @input="onSearch"
          />
          <!-- 搜索结果下拉 -->
          <div
            v-if="searchResults.length"
            class="absolute z-10 top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-modal)] max-h-40 overflow-auto"
          >
            <button
              v-for="ev in searchResults"
              :key="ev.id"
              class="w-full px-3 py-2 text-left text-xs hover:bg-[var(--color-primary-bg)] transition-colors"
              :class="selectedEventId === ev.id ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' : 'text-[var(--color-text-body)]'"
              @click="selectEvent(ev)"
            >
              <span class="font-medium">{{ ev.title }}</span>
              <span v-if="ev.eventDate" class="ml-2 text-[var(--color-text-disabled)]">{{ formatDate(ev.eventDate) }}</span>
            </button>
          </div>
        </div>

        <!-- 已选事件显示 -->
        <div v-if="selectedEventTitle" class="text-xs text-[var(--color-text-body)]">
          已选：<span class="font-medium text-[var(--color-primary)]">{{ selectedEventTitle }}</span>
        </div>

        <!-- 关系类型 -->
        <select
          v-model="selectedType"
          class="w-full px-3 py-1.5 text-xs rounded-[var(--radius-input)] border border-[var(--color-border-input)] bg-[var(--color-bg-card)] text-[var(--color-text-body)] outline-none focus:border-[var(--color-primary)]"
        >
          <option v-for="(label, val) in RELATION_LABELS" :key="val" :value="val">{{ label }}</option>
        </select>

        <div class="flex gap-2">
          <button
            class="flex-1 py-1.5 text-xs rounded-[var(--radius-btn)] bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            :disabled="!selectedEventId || adding"
            @click="addRelation"
          >{{ adding ? '添加中…' : '确认关联' }}</button>
          <button
            class="px-3 py-1.5 text-xs rounded-[var(--radius-btn)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] transition-colors"
            @click="cancelAdd"
          >取消</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { eventApi, type EventRelation, type RelationType } from '@/api/event'
import { useEventStore } from '@/stores/event'
import { usePermission } from '@/composables/usePermission'
import { useToast } from '@/composables/useToast'
import type { EventItem } from '@/types'

const props = defineProps<{
  event:  EventItem
  cpId:   string
}>()

const emit = defineEmits<{
  'jump-to-event': [eventId: string]
}>()

const { canInCp } = usePermission()
const eventStore  = useEventStore()
const toast       = useToast()

const relations       = ref<EventRelation[]>([])
const loading         = ref(false)
const showAdd         = ref(false)
const searchKeyword   = ref('')
const searchResults   = ref<EventItem[]>([])
const selectedEventId    = ref('')
const selectedEventTitle = ref('')
const selectedType    = ref<RelationType>('related')
const adding          = ref(false)

const RELATION_LABELS: Record<string, string> = {
  related:   '相关',
  caused_by: '因果↑',
  led_to:    '因果↓',
  parallel:  '同期',
}

async function load() {
  loading.value = true
  try {
    const res = await eventApi.listRelations(props.cpId, props.event.id)
    relations.value = res.data
  } catch {
    // 静默失败，不影响其他交互
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimer)
  if (!searchKeyword.value.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    // 从 store 中的内存事件进行本地过滤（避免额外 API 调用）
    const all = eventStore.getEvents(props.cpId)
    const kw = searchKeyword.value.toLowerCase()
    searchResults.value = all
      .filter(e => e.id !== props.event.id && e.title.toLowerCase().includes(kw))
      .slice(0, 8)
  }, 200)
}

function selectEvent(ev: EventItem) {
  selectedEventId.value    = ev.id
  selectedEventTitle.value = ev.title
  searchKeyword.value      = ''
  searchResults.value      = []
}

async function addRelation() {
  if (!selectedEventId.value) return
  adding.value = true
  try {
    await eventApi.addRelation(props.cpId, props.event.id, selectedEventId.value, selectedType.value)
    await load()
    cancelAdd()
    toast.success('关联添加成功')
  } catch (e: unknown) {
    toast.error((e as Error).message || '添加失败')
  } finally {
    adding.value = false
  }
}

async function removeRelation(relationId: string) {
  if (!confirm('确认删除此关联？')) return
  try {
    await eventApi.removeRelation(props.cpId, props.event.id, relationId)
    relations.value = relations.value.filter(r => r.id !== relationId)
    toast.success('已移除')
  } catch {
    toast.error('删除失败')
  }
}

function cancelAdd() {
  showAdd.value         = false
  searchKeyword.value   = ''
  searchResults.value   = []
  selectedEventId.value = ''
  selectedEventTitle.value = ''
  selectedType.value    = 'related'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

onMounted(load)
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
