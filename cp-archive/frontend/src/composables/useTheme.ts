/**
 * 主题操作 Composable
 * 对外暴露主题切换、导入/导出等操作
 */
import { useThemeStore } from '@/stores/theme'
import { useToast } from './useToast'

export function useTheme() {
  const themeStore = useThemeStore()
  const toast      = useToast()

  function switchTheme(themeId: string) {
    themeStore.switchGlobalTheme(themeId)
  }

  function exportTheme() {
    themeStore.exportTheme()
    toast.success('主题已导出 ↓')
  }

  function importTheme(file: File) {
    return new Promise<boolean>((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const json = e.target?.result as string
        const config = themeStore.importTheme(json)
        if (config) {
          themeStore.switchGlobalTheme(config)
          toast.success(`主题「${config.name}」已导入并应用`)
          resolve(true)
        } else {
          toast.error('主题文件格式错误')
          resolve(false)
        }
      }
      reader.readAsText(file)
    })
  }

  return {
    allThemes:        themeStore.allThemes,
    activeTheme:      themeStore.activeTheme,
    switchTheme,
    exportTheme,
    importTheme,
    saveCustomTheme:  themeStore.saveCustomTheme,
    persistGlobalTheme: themeStore.persistGlobalTheme,
  }
}
