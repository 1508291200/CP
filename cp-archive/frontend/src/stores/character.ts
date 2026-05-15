/**
 * 人物（Character）状态管理
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { characterApi, type CreateCharacterPayload } from '@/api/character'
import type { Character } from '@/types'

export const useCharacterStore = defineStore('character', () => {
  const list    = ref<Character[]>([])
  const loading = ref(false)

  async function fetchList(cpId: string) {
    loading.value = true
    try {
      const res = await characterApi.list(cpId)
      list.value = res.data
    } finally {
      loading.value = false
    }
  }

  async function createCharacter(cpId: string, data: CreateCharacterPayload) {
    const res = await characterApi.create(cpId, data)
    list.value.push(res.data)
    return res.data
  }

  async function updateCharacter(cpId: string, id: string, data: Partial<CreateCharacterPayload>) {
    const res = await characterApi.update(cpId, id, data)
    const idx = list.value.findIndex(c => c.id === id)
    if (idx !== -1) list.value[idx] = res.data
    return res.data
  }

  async function deleteCharacter(cpId: string, id: string) {
    await characterApi.delete(cpId, id)
    list.value = list.value.filter(c => c.id !== id)
  }

  return { list, loading, fetchList, createCharacter, updateCharacter, deleteCharacter }
})
