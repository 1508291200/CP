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
  themeConfig?: Record<string, unknown>
}

export interface CpTab {
  id:        string
  cpId:      string
  name:      string
  tabType:   'profile' | 'timeline' | 'milestone' | 'custom'
  content:   Record<string, unknown>
  sortOrder: number
  isVisible: boolean
  createdAt: string
}

export const cpApi = {
  list:   (params?: CpQueryParams)               => api.get<CpItem[]>('/cps', params as Record<string, unknown>),
  get:    (id: string)                           => api.get<CpItem>(`/cps/${id}`),
  create: (data: CreateCpPayload)                => api.post<CpItem>('/cps', data),
  update: (id: string, data: Partial<CreateCpPayload>) => api.patch<CpItem>(`/cps/${id}`, data),
  delete: (id: string)                           => api.delete(`/cps/${id}`),

  // 自定义 Tab
  listTabs:    (id: string)                         => api.get<CpTab[]>(`/cps/${id}/tabs`),
  createTab:   (id: string, data: Partial<CpTab>)   => api.post<CpTab>(`/cps/${id}/tabs`, data),
  updateTab:   (id: string, tabId: string, data: Partial<CpTab>) => api.patch<CpTab>(`/cps/${id}/tabs/${tabId}`, data),
  deleteTab:   (id: string, tabId: string)          => api.delete(`/cps/${id}/tabs/${tabId}`),
  reorderTabs: (id: string, ids: string[])          => api.patch<null>(`/cps/${id}/tabs/reorder`, { ids }),
}
