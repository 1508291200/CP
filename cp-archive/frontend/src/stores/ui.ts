/**
 * UI 全局状态（侧边栏、Toast、Loading 等）
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

export const useUIStore = defineStore('ui', () => {
  const isDark = ref(
    localStorage.getItem('cp:dark') === 'true' ||
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const toasts = ref<ToastItem[]>([])
  const globalLoading = ref(false)

  function toggleDark() {
    isDark.value = !isDark.value
    localStorage.setItem('cp:dark', String(isDark.value))
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function initDark() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function addToast(type: ToastItem['type'], message: string, duration = 2500) {
    const id = crypto.randomUUID()
    toasts.value.push({ id, type, message })
    setTimeout(() => removeToast(id), duration)
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { isDark, toasts, globalLoading, toggleDark, initDark, addToast, removeToast }
})
