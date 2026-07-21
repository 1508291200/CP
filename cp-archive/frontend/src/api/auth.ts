/**
 * 认证相关 API
 */

import { api } from './client.js'

export interface LoginInput {
  username: string
  password: string
}

export interface RegisterInput {
  username:   string
  email:      string
  password:   string
  inviteCode: string
}

/** CP 级成员关系（来自 /auth/me 响应） */
export interface CpMembership {
  cpId:   string
  cpName: string
  cpRole: 'cp_admin' | 'editor'
}

export interface AuthUser {
  id:            string
  username:      string
  displayName:   string | null
  role:          'owner' | 'admin' | 'cp_admin' | 'editor' | 'viewer'
  avatarUrl:     string | null
  cpMemberships: CpMembership[]
}

export interface LoginResult {
  accessToken: string
  user:        AuthUser
}

export const authApi = {
  login:    (data: LoginInput) => api.post<LoginResult>('/auth/login', data),
  refresh:  () => api.post<{ accessToken: string }>('/auth/refresh'),
  logout:   () => api.post<void>('/auth/logout'),
  register: (data: RegisterInput) => api.post<AuthUser>('/auth/register', data),
  me:       () => api.get<AuthUser>('/auth/me'),

  // 忘记密码三步流程
  forgotPassword:  (email: string) =>
    api.post<null>('/auth/forgot-password', { email }),
  verifyResetCode: (email: string, code: string) =>
    api.post<{ resetToken: string }>('/auth/verify-reset-code', { email, code }),
  resetPassword:   (resetToken: string, newPassword: string) =>
    api.post<null>('/auth/reset-password', { resetToken, newPassword }),
}

// 具名导出供 RegisterView 直接使用
export const register = (data: RegisterInput) => authApi.register(data)
