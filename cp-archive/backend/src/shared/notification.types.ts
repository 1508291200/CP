/**
 * 通知事件类型定义（前后端共享语义）
 * 后端 emitNotification 时使用，Service 层消费时使用
 */

export type NotificationType =
  | 'event:created'
  | 'event:updated'
  | 'event:deleted'
  | 'event:milestone'
  | 'member:joined'
  | 'member:role_changed'
  | 'member:removed'
  | 'cp:updated'

export interface NotificationPayload {
  type:        NotificationType
  /** 关联 CP（全站操作时可省略） */
  cpId?:       string
  /** 触发者用户 ID（排除自身通知用） */
  actorId?:    string
  /** 关联实体 ID（如 eventId、userId） */
  entityId?:   string
  /** 关联实体类型：'event' | 'user' | 'cp' */
  entityType?: string
  /** 已格式化的通知标题 */
  title:       string
  /** 通知正文（可选） */
  body?:       string
}

/** 通知类型的中文标签（用于前端偏好设置展示） */
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

/** 哪些通知类型是 CP 级（需要 cpId） */
export const CP_SCOPED_TYPES: NotificationType[] = [
  'event:created', 'event:updated', 'event:deleted', 'event:milestone',
  'member:joined', 'member:role_changed', 'member:removed', 'cp:updated',
]
