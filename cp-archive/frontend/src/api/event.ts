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
}
