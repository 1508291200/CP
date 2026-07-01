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

// 深色模式下的 CSS token 值（与 themes/dark.ts 保持一致）
const DARK_TOKENS: Record<string, string> = {
  '--color-primary':        '#9B7FCA',
  '--color-primary-light':  '#B89EE0',
  '--color-primary-bg':     '#2A2240',
  '--color-bg-page':        '#1A1826',
  '--color-bg-card':        '#242133',
  '--color-bg-sidebar':     '#1E1C2E',
  '--color-text-title':     '#EEEEF5',
  '--color-text-body':      '#B8B8D0',
  '--color-text-secondary': '#6A6A80',
  '--color-text-disabled':  '#3A3A50',
  '--color-border':         '#333248',
  '--color-border-input':   '#3D3C55',
  '--shadow-card':          '0 2px 12px rgba(0, 0, 0, 0.24)',
  '--shadow-hover':         '0 6px 20px rgba(0, 0, 0, 0.32)',
  '--shadow-modal':         '0 12px 40px rgba(0, 0, 0, 0.40)',
}

// 默认浅色模式下的 CSS token 值（与 themes/default.ts 保持一致）
const LIGHT_TOKENS: Record<string, string> = {
  '--color-primary':        '#7B5EA7',
  '--color-primary-light':  '#9B7FCA',
  '--color-primary-bg':     '#F3EFFA',
  '--color-bg-page':        '#F7F6FA',
  '--color-bg-card':        '#FFFFFF',
  '--color-bg-sidebar':     '#F9F8FC',
  '--color-text-title':     '#1A1A2E',
  '--color-text-body':      '#3D3D5C',
  '--color-text-secondary': '#8A8AA0',
  '--color-text-disabled':  '#C4C4D4',
  '--color-border':         '#EBEBF0',
  '--color-border-input':   '#D8D8E8',
  '--shadow-card':          '0 2px 12px rgba(0, 0, 0, 0.06)',
  '--shadow-hover':         '0 6px 20px rgba(0, 0, 0, 0.10)',
  '--shadow-modal':         '0 12px 40px rgba(0, 0, 0, 0.14)',
}

/** 将 token map 写入 documentElement.style（内联样式，优先级最高） */
function applyTokens(tokens: Record<string, string>) {
  const root = document.documentElement
  for (const [key, val] of Object.entries(tokens)) {
    root.style.setProperty(key, val)
  }
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

    const tokens = isDark.value ? DARK_TOKENS : LIGHT_TOKENS
    applyTokens(tokens)
    // Vue 响应式 flush 后再覆写一次，防止其他 watcher 把值还原
    const snapshot = { ...tokens }
    setTimeout(() => applyTokens(snapshot), 0)
  }

  function initDark() {
    document.documentElement.classList.toggle('dark', isDark.value)
    if (isDark.value) {
      applyTokens(DARK_TOKENS)
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
