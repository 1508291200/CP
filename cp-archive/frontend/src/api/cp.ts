import { api } from './client'
import type { CpItem } from '@/types'

export interface CpQueryParams {
  q?: string
  status?: string
  tagId?: string
  page?: number
  limit?: number
}

export interface CreateCpPayload {
  name: string
  subtitle?: string
  description?: string
  coverUrl?: string
  bannerUrl?: string
  status?: string
  visibility?: string
  tagIds?: string[]
}

export const cpApi = {
  list:   (params?: CpQueryParams)               => api.get<CpItem[]>('/cps', params as Record<string, unknown>),
  get:    (id: string)                           => api.get<CpItem>(`/cps/${id}`),
  create: (data: CreateCpPayload)                => api.post<CpItem>('/cps', data),
  update: (id: string, data: Partial<CreateCpPayload>) => api.patch<CpItem>(`/cps/${id}`, data),
  delete: (id: string)                           => api.delete(`/cps/${id}`),
}
