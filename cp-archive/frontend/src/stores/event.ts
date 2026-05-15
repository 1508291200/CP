/**
 * 事件状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { eventApi, type EventQueryParams, type CreateEventPayload } from '@/api/event'
import type { EventItem } from '@/types'

export interface EventFilters {
  importance?: string
  dateStart?: string
  dateEnd?: string
  tagId?: string
  keyword?: string
  isMilestone?: boolean
  order?: 'asc' | 'desc'
}

export const useEventStore = defineStore('event', () => {
  // 按 cpId 分组缓存事件列表
  const eventsByCp = ref<Record<string, EventItem[]>>({})
  const loading     = ref(false)
  const filters     = ref<EventFilters>({ order: 'desc' })
  const selectedId  = ref<string | null>(null)

  // 当前 CP 的事件列表（外部通过 currentCpId 访问）
  function getEvents(cpId: string): EventItem[] {
    return eventsByCp.value[cpId] ?? []
  }

  const selected = computed(() => {
    // 遍历所有 CP 的事件找到选中的
    for (const events of Object.values(eventsByCp.value)) {
      const found = events.find(e => e.id === selectedId.value)
      if (found) return found
    }
    return null
  })

  async function fetchList(cpId: string, params?: EventQueryParams) {
    loading.value = true
    try {
      const res = await eventApi.list(cpId, { ...filters.value, ...params })
      eventsByCp.value[cpId] = res.data
    } finally {
      loading.value = false
    }
  }

  async function createEvent(cpId: string, data: CreateEventPayload) {
    const res = await eventApi.create(cpId, data)
    // 插入到正确位置（按日期排序）
    const list = eventsByCp.value[cpId] ?? []
    if (filters.value.order === 'asc') {
      eventsByCp.value[cpId] = [...list, res.data]
    } else {
      eventsByCp.value[cpId] = [res.data, ...list]
    }
    return res.data
  }

  async function updateEvent(cpId: string, id: string, data: Partial<CreateEventPayload>) {
    const res = await eventApi.update(cpId, id, data)
    const list = eventsByCp.value[cpId] ?? []
    const idx = list.findIndex(e => e.id === id)
    if (idx !== -1) {
      const updated = [...list]
      updated[idx] = res.data
      eventsByCp.value[cpId] = updated
    }
    return res.data
  }

  async function deleteEvent(cpId: string, id: string) {
    await eventApi.delete(cpId, id)
    eventsByCp.value[cpId] = (eventsByCp.value[cpId] ?? []).filter(e => e.id !== id)
    if (selectedId.value === id) selectedId.value = null
  }

  async function toggleMilestone(cpId: string, id: string, isMilestone: boolean) {
    if (isMilestone) {
      await eventApi.markMilestone(cpId, id)
    } else {
      await eventApi.unmarkMilestone(cpId, id)
    }
    const list = eventsByCp.value[cpId] ?? []
    const idx = list.findIndex(e => e.id === id)
    if (idx !== -1) {
      const updated = [...list]
      updated[idx] = { ...updated[idx], isMilestone }
      eventsByCp.value[cpId] = updated
    }
  }

  function setFilters(cpId: string, newFilters: EventFilters) {
    filters.value = { ...filters.value, ...newFilters }
    fetchList(cpId)
  }

  function selectEvent(id: string | null) {
    selectedId.value = id
  }

  return {
    eventsByCp,
    loading,
    filters,
    selectedId,
    selected,
    getEvents,
    fetchList,
    createEvent,
    updateEvent,
    deleteEvent,
    toggleMilestone,
    setFilters,
    selectEvent,
  }
})
