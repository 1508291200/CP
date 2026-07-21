<template>
  <div class="max-w-5xl mx-auto px-6 py-8">
    <!-- 大事记头部 -->
    <div class="flex items-center justify-between mb-6">
      <YearFilter
        :years="availableYears"
        v-model="selectedYear"
      />
      <Button v-if="can('cp:create')" size="sm" @click="openCreateMilestone">
        + 添加节点
      </Button>
    </div>

    <!-- 骨架屏 -->
    <div v-if="msStore.loading && !msStore.list.length" class="flex gap-4 overflow-x-auto pb-4">
      <div v-for="i in 4" :key="i" class="flex-shrink-0 w-48 h-60 rounded-[var(--radius-card)] bg-[var(--color-bg-card)] animate-pulse" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="!msStore.loading && !filteredMilestones.length" class="text-center py-20">
      <div class="text-5xl mb-4">🌟</div>
      <p class="text-[var(--color-text-secondary)] mb-4">还没有节点</p>
      <Button v-if="can('cp:create')" @click="openCreateMilestone">记录第一个节点</Button>
    </div>

    <!-- 横向滚动卡片 -->
    <div
      v-else
      class="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
      style="scrollbar-width: thin;"
    >
      <MilestoneCard
        v-for="ms in filteredMilestones"
        :key="ms.id"
        :milestone="ms"
        @edit="openEditMilestone(ms)"
        @deleted="removeMilestone(ms.id)"
        @jump-to-event="jumpToEvent"
      />
    </div>

    <!-- 底部统计 -->
    <div v-if="msStore.list.length" class="mt-8 grid grid-cols-3 gap-4">
      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] p-4 text-center shadow-[var(--shadow-card)]">
        <div class="text-2xl font-bold text-[var(--color-primary)]">{{ msStore.list.length }}</div>
        <div class="text-xs text-[var(--color-text-secondary)] mt-1">节点</div>
      </div>
      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] p-4 text-center shadow-[var(--shadow-card)]">
        <div class="text-2xl font-bold text-[var(--color-primary)]">{{ availableYears.length }}</div>
        <div class="text-xs text-[var(--color-text-secondary)] mt-1">跨越年份</div>
      </div>
      <div class="bg-[var(--color-bg-card)] rounded-[var(--radius-card)] p-4 text-center shadow-[var(--shadow-card)]">
        <div class="text-2xl font-bold text-[var(--color-primary)]">{{ linkedEventCount }}</div>
        <div class="text-xs text-[var(--color-text-secondary)] mt-1">关联事件</div>
      </div>
    </div>

    <!-- 里程碑表单弹窗 -->
    <MilestoneFormModal
      v-if="showMsModal"
      v-model:visible="showMsModal"
      :cp-id="cpId"
      :milestone="editingMs"
      @saved="onMsSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMilestoneStore } from '@/stores/milestone'
import { usePermission } from '@/composables/usePermission'
import Button from '@/components/base/Button.vue'
import YearFilter from '@/components/milestone/YearFilter.vue'
import MilestoneCard from '@/components/milestone/MilestoneCard.vue'
import MilestoneFormModal from '@/components/milestone/MilestoneFormModal.vue'
import type { CpItem, MilestoneItem } from '@/types'

const props = defineProps<{ cp?: CpItem | null; cpId: string }>()

const router = useRouter()
const msStore = useMilestoneStore()
const { can } = usePermission()

const selectedYear = ref<number | null>(null)
const showMsModal = ref(false)
const editingMs = ref<MilestoneItem | null>(null)

const availableYears = computed(() => {
  const years = new Set<number>()
  msStore.list.forEach(ms => {
    if (ms.milestoneDate) {
      years.add(new Date(ms.milestoneDate).getFullYear())
    }
  })
  return Array.from(years).sort((a, b) => b - a)
})

const filteredMilestones = computed(() => {
  if (!selectedYear.value) return msStore.list
  return msStore.list.filter(ms => {
    if (!ms.milestoneDate) return false
    return new Date(ms.milestoneDate).getFullYear() === selectedYear.value
  })
})

const linkedEventCount = computed(() =>
  msStore.list.filter(ms => ms.eventId).length
)

function openCreateMilestone() {
  editingMs.value = null
  showMsModal.value = true
}

function openEditMilestone(ms: MilestoneItem) {
  editingMs.value = ms
  showMsModal.value = true
}

function removeMilestone(id: string) {
  msStore.deleteMilestone(props.cpId, id)
}

function onMsSaved() {
  msStore.fetchList(props.cpId)
}

function jumpToEvent(eventId: string) {
  router.push({ name: 'cp-timeline', params: { id: props.cpId }, query: { eventId } })
}

onMounted(() => {
  msStore.fetchList(props.cpId)
})
</script>
