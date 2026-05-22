import { api } from './client.js'

export type NotificationType =
  | 'event:created' | 'event:updated' | 'event:deleted' | 'event:milestone'
  | 'member:joined' | 'member:role_changed' | 'member:removed' | 'cp:updated'

export interface Notification {
  id:          string
  type:        NotificationType
  cpId?:       string
  actorId?:    string
  entityId?:   string
  entityType?: string
  title:       string
  body?:       string
  isRead:      boolean
  createdAt:   string
}

export interface NotificationPreference {
  userId:  string
  cpId?:   string | null
  type:    NotificationType
  enabled: boolean
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  'event:created':       '新事件发布',
  'event:updated':       '事件内容更新',
  'event:deleted':       '事件删除',
  'event:milestone':     '里程碑标记',
  'member:joined':       '新成员加入',
  'member:role_changed': '成员权限变更',
  'member:removed':      '成员被移除',
  'cp:updated':          'CP 信息更新',
}

export const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'event:created', 'event:updated', 'event:deleted', 'event:milestone',
  'member:joined', 'member:role_changed', 'member:removed', 'cp:updated',
]

export const notificationApi = {
  /**
   * 获取通知列表（分页）
   */
  list(params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    return api.get<Notification[]>('/notifications', params as Record<string, unknown>)
  },

  /**
   * 获取未读数（轻量，用于轮询）
   */
  getUnreadCount() {
    return api.get<{ count: number }>('/notifications/unread-count')
  },

  /**
   * 标记指定通知已读
   */
  markRead(ids: string[]) {
    return api.patch<null>('/notifications/read', { ids })
  },

  /**
   * 全部标记已读
   */
  markAllRead() {
    return api.patch<null>('/notifications/read', { all: true })
  },

  /**
   * 获取偏好设置
   */
  getPreferences(cpId?: string) {
    return api.get<NotificationPreference[]>('/notifications/preferences', cpId ? { cpId } : undefined)
  },

  /**
   * 单条更新偏好
   */
  setPreference(data: { type: NotificationType; enabled: boolean; cpId?: string }) {
    return api.patch<null>('/notifications/preferences', data)
  },

  /**
   * 批量更新偏好
   */
  batchSetPreferences(prefs: Array<{ type: NotificationType; enabled: boolean; cpId?: string }>) {
    return api.put<null>('/notifications/preferences/batch', { prefs })
  },
}
