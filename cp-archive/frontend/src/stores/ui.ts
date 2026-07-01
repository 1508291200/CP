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
    // 同步立即生效一次
    applyDarkTokens(isDark.value)
    // Vue 响应式 flush 后再执行一次，防止 watcher 覆盖
    const target = isDark.value
    setTimeout(() => applyDarkTokens(target), 0)
  }

  function initDark() {
    document.documentElement.classList.toggle('dark', isDark.value)
    if (isDark.value) {
      applyDarkTokens(true)
    }
  }

  function applyDarkTokens(dark: boolean) {
    const root = document.documentElement
    if (dark) {
      root.style.setProperty('--color-primary',        '#9B7FCA')
      root.style.setProperty('--color-primary-light',  '#B89EE0')
      root.style.setProperty('--color-primary-bg',     '#2A2240')
      root.style.setProperty('--color-bg-page',        '#1A1826')
      root.style.setProperty('--color-bg-card',        '#242133')
      root.style.setProperty('--color-bg-sidebar',     '#1E1C2E')
      root.style.setProperty('--color-text-title',     '#EEEEF5')
      root.style.setProperty('--color-text-body',      '#B8B8D0')
      root.style.setProperty('--color-text-secondary', '#6A6A80')
      root.style.setProperty('--color-text-disabled',  '#3A3A50')
      root.style.setProperty('--color-border',         '#333248')
      root.style.setProperty('--color-border-input',   '#3D3C55')
      root.style.setProperty('--shadow-card',          '0 2px 12px rgba(0, 0, 0, 0.24)')
      root.style.setProperty('--shadow-hover',         '0 6px 20px rgba(0, 0, 0, 0.32)')
      root.style.setProperty('--shadow-modal',         '0 12px 40px rgba(0, 0, 0, 0.40)')
    } else {
      const savedId = localStorage.getItem('cp:themeId')
      if (!savedId || savedId === 'dark') {
        root.style.setProperty('--color-primary',        '#7B5EA7')
        root.style.setProperty('--color-primary-light',  '#9B7FCA')
        root.style.setProperty('--color-primary-bg',     '#F3EFFA')
        root.style.setProperty('--color-bg-page',        '#F7F6FA')
        root.style.setProperty('--color-bg-card',        '#FFFFFF')
        root.style.setProperty('--color-bg-sidebar',     '#F9F8FC')
        root.style.setProperty('--color-text-title',     '#1A1A2E')
        root.style.setProperty('--color-text-body',      '#3D3D5C')
        root.style.setProperty('--color-text-secondary', '#8A8AA0')
        root.style.setProperty('--color-text-disabled',  '#C4C4D4')
        root.style.setProperty('--color-border',         '#EBEBF0')
        root.style.setProperty('--color-border-input',   '#D8D8E8')
        root.style.setProperty('--shadow-card',          '0 2px 12px rgba(0, 0, 0, 0.06)')
        root.style.setProperty('--shadow-hover',         '0 6px 20px rgba(0, 0, 0, 0.10)')
        root.style.setProperty('--shadow-modal',         '0 12px 40px rgba(0, 0, 0, 0.14)')
      }
    }
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
