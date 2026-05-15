/**
 * useToast composable
 * 对接 UIStore 的 Toast 功能，提供语义化方法
 */
import { useUIStore } from '@/stores/ui'

export function useToast() {
  const ui = useUIStore()
  return {
    success: (msg: string) => ui.addToast('success', msg),
    error:   (msg: string) => ui.addToast('error', msg),
    info:    (msg: string) => ui.addToast('info', msg),
    warning: (msg: string) => ui.addToast('warning', msg),
  }
}
