/**
 * 大事记（Milestone）状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { milestoneApi, type CreateMilestonePayload } from '@/api/milestone'
import type { MilestoneItem } from '@/types'

export const useMilestoneStore = defineStore('milestone', () => {
  const list    = ref<MilestoneItem[]>([])
  const loading = ref(false)

  async function fetchList(cpId: string) {
    loading.value = true
    try {
      const res = await milestoneApi.list(cpId)
      list.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function createMilestone(cpId: string, data: CreateMilestonePayload) {
    const res = await milestoneApi.create(cpId, data)
    list.value.push(res.data)
    return res.data
  }

  async function updateMilestone(cpId: string, id: string, data: Partial<CreateMilestonePayload>) {
    const res = await milestoneApi.update(cpId, id, data)
    const idx = list.value.findIndex(m => m.id === id)
    if (idx !== -1) list.value[idx] = res.data
    return res.data
  }

  async function deleteMilestone(cpId: string, id: string) {
    await milestoneApi.delete(cpId, id)
    list.value = list.value.filter(m => m.id !== id)
  }

  return { list, loading, fetchList, createMilestone, updateMilestone, deleteMilestone }
})
