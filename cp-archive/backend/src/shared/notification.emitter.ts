/**
 * 进程内通知事件总线
 *
 * 设计：
 *   - 使用 Node.js 原生 EventEmitter（轻量，无额外依赖）
 *   - 业务模块只调用 emitNotification()，不需要知道谁消费
 *   - NotificationService 在启动时订阅 'notification' 事件
 *
 * 升级路径：
 *   - 如需跨进程/多实例，将 emitNotification 内部替换为 Redis Pub/Sub 即可，
 *     业务模块调用方式保持不变
 */

import { EventEmitter } from 'node:events'
import type { NotificationPayload } from './notification.types.js'

class NotificationBusEmitter extends EventEmitter {}

export const notificationBus = new NotificationBusEmitter()
notificationBus.setMaxListeners(20)

/**
 * 发布通知事件
 * 在业务操作成功后调用，不影响主流程（fire-and-forget）
 */
export function emitNotification(payload: NotificationPayload): void {
  // 异步处理，不阻塞业务流程
  setImmediate(() => {
    notificationBus.emit('notification', payload)
  })
}
