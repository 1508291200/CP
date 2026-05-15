/**
 * 全局共享类型定义
 * 与后端 Drizzle Schema 对应，保持字段命名一致（camelCase）
 */

export type UserRole = 'owner' | 'admin' | 'editor' | 'contributor' | 'viewer'
export type CpStatus = 'active' | 'archived' | 'completed'
export type Visibility = 'public' | 'members' | 'private'
export type Importance = 'critical' | 'high' | 'medium' | 'normal' | 'low'
export type DatePrecision = 'year' | 'month' | 'day'
export type EventVisibility = 'public' | 'members' | 'specified' | 'private'

export interface TagItem {
  id: string
  name: string
  color: string
  category: string | null
}

export interface CpItem {
  id: string
  name: string
  subtitle: string | null
  description: string | null
  coverUrl: string | null
  bannerUrl: string | null
  status: CpStatus
  visibility: Visibility
  themeConfig: Record<string, unknown>
  sortOrder: number
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface Character {
  id: string
  cpId: string
  name: string
  aliases: string[]
  avatarUrl: string | null
  roleLabel: string | null
  birthday: string | null
  bio: string | null
  customFields: unknown[]
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface EventItem {
  id: string
  cpId: string
  title: string
  summary: string | null
  content: Record<string, unknown>
  eventDate: string | null
  datePrecision: DatePrecision
  importance: Importance
  visibility: EventVisibility
  isMilestone: boolean
  sourceRef: string | null
  emotionIcon: string | null
  customFields: Record<string, unknown>
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface MilestoneItem {
  id: string
  cpId: string
  eventId: string | null
  title: string
  description: string | null
  milestoneDate: string | null
  icon: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}
