import { api } from './client'

export const settingsApi = {
  getAll: () => api.get<Record<string, unknown>>('/settings'),
  patch:  (updates: Record<string, unknown>) => api.patch<Record<string, unknown>>('/settings', updates),
}
