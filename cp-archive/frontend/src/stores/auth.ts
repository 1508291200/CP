/**
 * 认证状态管理
 * - accessToken 存内存（不持久化，防 XSS）
 * - user 基础信息存 localStorage（非敏感，仅用于页面恢复）
 * - cpMemberships 从 /auth/me 获取，同步存 localStorage
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authApi, type AuthUser, type CpMembership } from '@/api/auth'
import { setAccessToken } from '@/api/client'

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  const user = ref<AuthUser | null>(
    (() => {
      try {
        const stored = localStorage.getItem('cp:user')
        return stored ? (JSON.parse(stored) as AuthUser) : null
      } catch {
        return null
      }
    })(),
  )

  const isLoggedIn  = computed(() => user.value !== null)
  const role        = computed(() => user.value?.role ?? null)
  // 直接从 user 对象中取，保持单一数据源
  const cpMemberships = computed<CpMembership[]>(() => user.value?.cpMemberships ?? [])

  function setUser(u: AuthUser | null) {
    user.value = u
    if (u) {
      localStorage.setItem('cp:user', JSON.stringify(u))
    } else {
      localStorage.removeItem('cp:user')
    }
  }

  async function login(username: string, password: string) {
    const res = await authApi.login({ username, password })
    setAccessToken(res.data.accessToken)
    setUser(res.data.user)
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      setAccessToken(null)
      setUser(null)
      router.push('/login')
    }
  }

  /**
   * 刷新当前用户信息（含 cpMemberships）
   * 在 token 刷新后或需要更新用户信息时调用
   */
  async function refreshUserInfo() {
    try {
      const res = await authApi.me()
      setUser(res.data)
    } catch {
      // 获取失败不影响当前登录状态
    }
  }

  // 监听来自 api/client.ts 的自动登出事件
  window.addEventListener('auth:logout', () => {
    setUser(null)
    router.push('/login')
  })

  return {
    user,
    isLoggedIn,
    role,
    cpMemberships,
    login,
    logout,
    setUser,
    refreshUserInfo,
  }
})
