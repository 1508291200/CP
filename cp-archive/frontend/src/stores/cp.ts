/**
 * CP 状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cpApi, type CpQueryParams, type CreateCpPayload } from '@/api/cp'
import type { CpItem } from '@/types'
import type { PaginationMeta } from '@/api/client'

export const useCpStore = defineStore('cp', () => {
  const list    = ref<CpItem[]>([])
  const current = ref<CpItem | null>(null)
  const loading = ref(false)
  const meta    = ref<PaginationMeta | null>(null)
  const searchQuery = ref('')

  const hasMore = computed(() => meta.value?.hasMore ?? false)

  async function fetchList(params?: CpQueryParams, append = false) {
    loading.value = true
    try {
      const res = await cpApi.list(params)
      list.value = append ? [...list.value, ...res.data] : res.data
      if (res.meta) meta.value = res.meta
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id: string) {
    loading.value = true
    try {
      const res = await cpApi.get(id)
      current.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function createCp(data: CreateCpPayload) {
    const res = await cpApi.create(data)
    list.value.unshift(res.data)
    return res.data
  }

  async function updateCp(id: string, data: Partial<CreateCpPayload>) {
    const res = await cpApi.update(id, data)
    const idx = list.value.findIndex(c => c.id === id)
    if (idx !== -1) list.value[idx] = res.data
    if (current.value?.id === id) current.value = res.data
    return res.data
  }

  async function deleteCp(id: string) {
    await cpApi.delete(id)
    list.value = list.value.filter(c => c.id !== id)
    if (current.value?.id === id) current.value = null
  }

  return { list, current, loading, meta, searchQuery, hasMore, fetchList, fetchById, createCp, updateCp, deleteCp }
})
