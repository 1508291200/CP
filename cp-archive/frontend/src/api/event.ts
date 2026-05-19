import { api } from './client'
import type { EventItem } from '@/types'

export interface EventQueryParams {
  importance?: string
  dateStart?: string
  dateEnd?: string
  tagId?: string
  keyword?: string
  isMilestone?: boolean
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface CreateEventPayload {
  title: string
  summary?: string
  content?: Record<string, unknown>
  eventDate?: string | null
  datePrecision?: string
  importance?: string
  visibility?: string
  isMilestone?: boolean
  sourceRef?: string
  emotionIcon?: string
  customFields?: Record<string, unknown>
  tagIds?: string[]
}

export interface EventVersion {
  id:        string
  eventId:   string
  snapshot:  Record<string, unknown>
  editedBy:  string | null
  createdAt: string
}

export interface BatchUpdateInput {
  ids:          string[]
  importance?:  string
  addTagIds?:   string[]
  removeTagIds?: string[]
}

export const eventApi = {
  list:            (cpId: string, params?: EventQueryParams) =>
    api.get<EventItem[]>(`/cps/${cpId}/events`, params as Record<string, unknown>),
  get:             (cpId: string, id: string)                => api.get<EventItem>(`/cps/${cpId}/events/${id}`),
  create:          (cpId: string, data: CreateEventPayload)  => api.post<EventItem>(`/cps/${cpId}/events`, data),
  update:          (cpId: string, id: string, data: Partial<CreateEventPayload>) =>
    api.patch<EventItem>(`/cps/${cpId}/events/${id}`, data),
  delete:          (cpId: string, id: string)                => api.delete(`/cps/${cpId}/events/${id}`),
  markMilestone:   (cpId: string, id: string)                => api.post(`/cps/${cpId}/events/${id}/milestone`),
  unmarkMilestone: (cpId: string, id: string)                => api.delete(`/cps/${cpId}/events/${id}/milestone`),

  // 版本历史
  listVersions:   (cpId: string, id: string)                          => api.get<EventVersion[]>(`/cps/${cpId}/events/${id}/versions`),
  restoreVersion: (cpId: string, id: string, versionId: string)       => api.post<EventItem>(`/cps/${cpId}/events/${id}/versions/${versionId}/restore`),

  // 批量操作
  batchUpdate: (cpId: string, data: BatchUpdateInput)                 => api.patch<{ updated: number }>(`/cps/${cpId}/events/batch`, data),
  batchDelete: (cpId: string, ids: string[])                          => api.delete<{ deleted: number }>(`/cps/${cpId}/events/batch`, { ids }),
}

// 模板 API
export interface EventTemplate {
  name:        string
  importance?: string
  emotionIcon?: string
  contentHint?: string
  tagIds?:     string[]
}

export const templateApi = {
  list:   ()                          => api.get<EventTemplate[]>('/settings/templates'),
  save:   (tpl: EventTemplate)        => api.post<EventTemplate[]>('/settings/templates', tpl),
  delete: (name: string)              => api.delete(`/settings/templates/${encodeURIComponent(name)}`),
}
