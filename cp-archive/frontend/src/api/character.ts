import { api } from './client'
import type { Character } from '@/types'

export interface CreateCharacterPayload {
  name: string
  aliases?: string[]
  avatarUrl?: string
  roleLabel?: string
  birthday?: string
  bio?: string
  customFields?: unknown[]
  sortOrder?: number
}

export const characterApi = {
  list:   (cpId: string)                                          => api.get<Character[]>(`/cps/${cpId}/characters`),
  create: (cpId: string, data: CreateCharacterPayload)            => api.post<Character>(`/cps/${cpId}/characters`, data),
  update: (cpId: string, id: string, data: Partial<CreateCharacterPayload>) =>
    api.patch<Character>(`/cps/${cpId}/characters/${id}`, data),
  delete: (cpId: string, id: string)                             => api.delete(`/cps/${cpId}/characters/${id}`),
}
