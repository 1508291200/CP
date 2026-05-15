import { api } from './client'
import type { MilestoneItem } from '@/types'

export interface CreateMilestonePayload {
  title: string
  description?: string
  milestoneDate?: string
  icon?: string
  eventId?: string
  sortOrder?: number
}

export const milestoneApi = {
  list:   (cpId: string)                                              => api.get<MilestoneItem[]>(`/cps/${cpId}/milestones`),
  create: (cpId: string, data: CreateMilestonePayload)                => api.post<MilestoneItem>(`/cps/${cpId}/milestones`, data),
  update: (cpId: string, id: string, data: Partial<CreateMilestonePayload>) =>
    api.patch<MilestoneItem>(`/cps/${cpId}/milestones/${id}`, data),
  delete: (cpId: string, id: string)                                 => api.delete(`/cps/${cpId}/milestones/${id}`),
}
