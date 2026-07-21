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

  /**
   * 切换深色/浅色模式
   *
   * 注意：主题系统（themeStore）会把颜色 token 写入 documentElement.style（内联样式），
   * 内联样式优先级高于所有 CSS class 规则，因此单纯切换 html.dark class 无法覆盖内联样式。
   * 这里直接操作内联 CSS 变量来确保深色模式生效。
   */
  function toggleDark() {
    isDark.value = !isDark.value
    localStorage.setItem('cp:dark', String(isDark.value))

    // 同步 html.dark class（供 Tailwind dark: variants 使用）
    document.documentElement.classList.toggle('dark', isDark.value)

    // 直接将对应的颜色 token 写入内联样式（覆盖 themeStore 的初始化值）
    applyDarkTokens(isDark.value)
  }

  /**
   * 初始化深色模式（页面加载时调用）
   * 在 themeStore.init() 之后调用，或者 themeStore 在 apply 时会覆盖我们的值，
   * 所以需要在 themeStore.init() 完成后再执行此函数。
   * main.ts 中已在 themeStore.init() 之后调用 uiStore.initDark()。
   */
  function initDark() {
    document.documentElement.classList.toggle('dark', isDark.value)
    if (isDark.value) {
      applyDarkTokens(true)
    }
  }

  /** 将深色/浅色 token 直接写入 documentElement.style */
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
      // 浅色模式：移除内联覆盖，恢复 CSS 文件中的默认值
      // （themeStore 如果有激活主题会重新写入，无主题则用 globals.css 的 :root 默认值）
      const keys = [
        '--color-primary', '--color-primary-light', '--color-primary-bg',
        '--color-bg-page', '--color-bg-card', '--color-bg-sidebar',
        '--color-text-title', '--color-text-body', '--color-text-secondary',
        '--color-text-disabled', '--color-border', '--color-border-input',
        '--shadow-card', '--shadow-hover', '--shadow-modal',
      ]
      // 重新应用当前主题（themeStore 里的 globalTheme）
      // 为避免循环依赖，直接从 localStorage 读取主题 id 然后重新设置
      const savedId = localStorage.getItem('cp:themeId')
      if (!savedId || savedId === 'dark') {
        // 恢复默认浅色 token
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
      // 如果有其他主题（sakura/inkgreen/vintage）由 themeStore 管理，此处保留不动
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
