/**
 * 认证状态管理
 * - accessToken 存内存（不持久化，防 XSS）
 * - user 基础信息存 localStorage（非敏感，仅用于页面恢复）
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authApi, type AuthUser } from '@/api/auth'
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

  const isLoggedIn = computed(() => user.value !== null)
  const role = computed(() => user.value?.role ?? null)

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

  // 监听来自 api/client.ts 的自动登出事件
  window.addEventListener('auth:logout', () => {
    setUser(null)
    router.push('/login')
  })

  return { user, isLoggedIn, role, login, logout, setUser }
})
