import { api } from './client'
import type { TagItem } from '@/types'

export const tagApi = {
  list:   ()                           => api.get<TagItem[]>('/tags'),
  create: (data: Partial<TagItem>)     => api.post<TagItem>('/tags', data),
  update: (id: string, data: Partial<TagItem>) => api.patch<TagItem>(`/tags/${id}`, data),
  delete: (id: string)                 => api.delete(`/tags/${id}`),
}
