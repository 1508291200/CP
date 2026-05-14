/**
 * 认证相关 API
 */

import { api } from './client.js'

export interface LoginInput {
  username: string
  password: string
}

export interface RegisterInput {
  username: string
  password: string
  inviteCode: string
}

export interface AuthUser {
  id: string
  username: string
  displayName: string | null
  role: 'owner' | 'admin' | 'editor' | 'contributor' | 'viewer'
  avatarUrl: string | null
}

export interface LoginResult {
  accessToken: string
  user: AuthUser
}

export const authApi = {
  login: (data: LoginInput) => api.post<LoginResult>('/auth/login', data),
  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),
  logout: () => api.post<void>('/auth/logout'),
  register: (data: RegisterInput) => api.post<AuthUser>('/auth/register', data),
}
