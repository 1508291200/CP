/**
 * 事件操作 Composable
 * 封装 CRUD 逻辑，组件只需关注 UI 状态
 */
import { useEventStore } from '@/stores/event'
import { useToast } from './useToast'
import { ApiClientError } from '@/api/client'
import type { CreateEventPayload } from '@/api/event'

export function useEvent(cpId: string) {
  const eventStore = useEventStore()
  const toast      = useToast()

  async function loadEvents() {
    await eventStore.fetchList(cpId)
  }

  async function createEvent(data: CreateEventPayload) {
    try {
      const ev = await eventStore.createEvent(cpId, data)
      toast.success('事件已保存 ✓')
      return ev
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '保存失败，请稍后重试')
      throw err
    }
  }

  async function updateEvent(id: string, data: Partial<CreateEventPayload>) {
    try {
      const ev = await eventStore.updateEvent(cpId, id, data)
      toast.success('已更新 ✓')
      return ev
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '更新失败')
      throw err
    }
  }

  async function deleteEvent(id: string) {
    try {
      await eventStore.deleteEvent(cpId, id)
      toast.success('已删除')
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '删除失败')
      throw err
    }
  }

  async function toggleMilestone(id: string, isMilestone: boolean) {
    try {
      await eventStore.toggleMilestone(cpId, id, isMilestone)
      toast.success(isMilestone ? '已标记为里程碑 🌟' : '已取消里程碑标记')
    } catch (err) {
      toast.error('操作失败')
      throw err
    }
  }

  return { loadEvents, createEvent, updateEvent, deleteEvent, toggleMilestone }
}
