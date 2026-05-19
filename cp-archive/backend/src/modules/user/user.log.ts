/**
 * 操作日志写入工具
 * 独立文件避免循环依赖，service 层调用此函数记录操作
 */
import { getDb } from '../../db/connection.js'
import { operationLogs } from '../../db/schema/index.js'

export async function logOperation(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  detail?: Record<string, unknown>,
) {
  try {
    const db = getDb()
    await db.insert(operationLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      detail: detail ?? {},
    })
  } catch (err) {
    // 日志写入失败不影响主业务
    console.error('[Log] Failed to write operation log:', err)
  }
}
