/**
 * 主题状态管理
 * - 管理全局主题和 CP 级专属主题
 * - 通过直接修改 CSS 变量实现实时主题切换（无需重渲染）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ThemeConfig } from '@/styles/themes/types'
import { defaultTheme }  from '@/styles/themes/default'
import { darkTheme }     from '@/styles/themes/dark'
import { sakuraTheme }   from '@/styles/themes/sakura'
import { inkgreenTheme } from '@/styles/themes/inkgreen'
import { vintageTheme }  from '@/styles/themes/vintage'
import { settingsApi }   from '@/api/settings'

// 内置主题集合
export const BUILTIN_THEMES: ThemeConfig[] = [
  defaultTheme,
  darkTheme,
  sakuraTheme,
  inkgreenTheme,
  vintageTheme,
]

const THEME_STORAGE_KEY = 'cp:themeId'

export const useThemeStore = defineStore('theme', () => {
  const globalTheme  = ref<ThemeConfig>(defaultTheme)
  const cpTheme      = ref<ThemeConfig | null>(null)
  const customThemes = ref<ThemeConfig[]>([])

  const activeTheme = computed(() => cpTheme.value ?? globalTheme.value)
  const allThemes   = computed(() => [...BUILTIN_THEMES, ...customThemes.value])

  // ── 核心方法：将 ThemeConfig 写入 CSS 变量 ──────────────
  function applyTheme(config: ThemeConfig) {
    const root = document.documentElement

    // tokens
    for (const [key, val] of Object.entries(config.tokens)) {
      root.style.setProperty(key, val)
    }
    // fonts
    if (config.fonts) {
      for (const [key, val] of Object.entries(config.fonts)) {
        if (val) root.style.setProperty(key, val)
      }
    }
    // layout
    if (config.layout) {
      for (const [key, val] of Object.entries(config.layout)) {
        if (val) root.style.setProperty(key, val)
      }
    }
    // 深色模式类
    root.classList.toggle('dark', config.isDark ?? false)
  }

  /** 切换全局主题（按 id 或传入完整 config） */
  function switchGlobalTheme(themeOrId: string | ThemeConfig) {
    let config: ThemeConfig | undefined
    if (typeof themeOrId === 'string') {
      config = allThemes.value.find(t => t.id === themeOrId)
    } else {
      config = themeOrId
    }
    if (!config) return

    globalTheme.value = config
    localStorage.setItem(THEME_STORAGE_KEY, config.id)
    if (!cpTheme.value) applyTheme(config)
  }

  /** 进入 CP 页面时应用 CP 专属主题 */
  function applyCpTheme(themeConfig: Record<string, unknown> | null) {
    if (!themeConfig?.enabled) {
      cpTheme.value = null
      applyTheme(globalTheme.value)
      return
    }
    // themeConfig 存储的是 ThemeConfig.tokens 对象
    const cpCfg: ThemeConfig = {
      id:     'cp-custom',
      name:   'CP 专属主题',
      tokens: themeConfig as ThemeConfig['tokens'],
    }
    cpTheme.value = cpCfg
    applyTheme(cpCfg)
  }

  /** 离开 CP 页面时恢复全局主题 */
  function resetToGlobal() {
    if (!cpTheme.value) return
    cpTheme.value = null
    applyTheme(globalTheme.value)
  }

  /** 导出当前主题为 JSON 文件 */
  function exportTheme() {
    const blob = new Blob([JSON.stringify(activeTheme.value, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `theme-${activeTheme.value.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 导入主题 JSON */
  function importTheme(json: string): ThemeConfig | null {
    try {
      const config = JSON.parse(json) as ThemeConfig
      if (!config.id || !config.tokens) throw new Error('Invalid theme format')
      // 自定义主题加 user- 前缀防止与内置主题冲突
      config.id = `user-${config.id}`
      customThemes.value = customThemes.value.filter(t => t.id !== config.id)
      customThemes.value.push(config)
      return config
    } catch {
      return null
    }
  }

  /** 保存自定义主题 */
  function saveCustomTheme(name: string, tokens: ThemeConfig['tokens']) {
    const id = `user-${Date.now()}`
    const config: ThemeConfig = { id, name, tokens }
    customThemes.value.push(config)
    return config
  }

  /** 将全局主题同步到后端 settings */
  async function persistGlobalTheme() {
    try {
      await settingsApi.patch({ global_theme: globalTheme.value })
    } catch { /* 非关键操作，失败不提示 */ }
  }

  /** 初始化：从 localStorage 恢复主题 */
  function init() {
    const savedId = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedId) {
      const found = BUILTIN_THEMES.find(t => t.id === savedId)
      if (found) {
        globalTheme.value = found
        applyTheme(found)
        return
      }
    }
    // 如果没有保存，使用默认（globals.css 已定义，无需 applyTheme）
  }

  return {
    globalTheme,
    cpTheme,
    customThemes,
    activeTheme,
    allThemes,
    applyTheme,
    switchGlobalTheme,
    applyCpTheme,
    resetToGlobal,
    exportTheme,
    importTheme,
    saveCustomTheme,
    persistGlobalTheme,
    init,
  }
})
