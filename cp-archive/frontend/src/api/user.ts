import { api } from './client'

export interface UserPublic {
  id: string
  username: string
  email: string
  role: 'owner' | 'admin' | 'editor' | 'contributor' | 'viewer'
  displayName: string | null
  avatarUrl: string | null
  preferences: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Invitation {
  id: string
  code: string
  role: string
  createdBy: string | null
  usedBy: string | null
  expiresAt: string | null
  createdAt: string
}

export interface UserListResult {
  items: UserPublic[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const getMe = () =>
  api.get<UserPublic>('/users/me')

export const updateMe = (data: { displayName?: string; avatarUrl?: string }) =>
  api.patch<UserPublic>('/users/me', data)

export const listUsers = (params?: { role?: string; keyword?: string; page?: number; limit?: number }) =>
  api.get<UserListResult>('/users', { params })

export const updateUserRole = (userId: string, role: string) =>
  api.patch<UserPublic>(`/users/${userId}/role`, { role })

export const deactivateUser = (userId: string) =>
  api.delete(`/users/${userId}`)

export const generateInvite = (data: { role: string; expiresIn: string }) =>
  api.post<Invitation>('/users/invite', data)

export const listInvitations = () =>
  api.get<Invitation[]>('/users/invitations')

export const revokeInvitation = (code: string) =>
  api.delete(`/users/invitations/${code}`)

export interface OperationLog {
  id:           string
  action:       string
  resourceType: string | null
  resourceId:   string | null
  detail:       Record<string, unknown> | null
  ip:           string | null
  createdAt:    string
  userId:       string | null
  username:     string | null
  displayName:  string | null
}

export interface LogListResult {
  items: OperationLog[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const listLogs = (params?: { page?: number; limit?: number; action?: string; resourceType?: string }) =>
  api.get<LogListResult>('/users/logs', params as Record<string, unknown>)
