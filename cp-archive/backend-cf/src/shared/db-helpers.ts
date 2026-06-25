/**
 * 共享工具：D1 不支持 .returning()，封装 insert→select 模式
 */
import { eq } from 'drizzle-orm'
import type { DrizzleD1 } from '../db/connection.js'

/**
 * D1 insert 后通过 id 查回完整记录
 * @param db   drizzle 实例
 * @param table drizzle table 对象
 * @param id   插入时指定的 id
 */
export async function insertAndReturn<T extends { id: string }>(
  db: DrizzleD1,
  table: Parameters<DrizzleD1['select']>[0] extends infer _ ? never : never,
  id: string,
): Promise<T> {
  // D1 workaround：直接让调用方负责 select，这里只做类型提示
  throw new Error('Use db.select().from(table).where(eq(table.id, id)) directly')
}

/** 获取当前时间（Date 对象，供 drizzle timestamp 字段使用） */
export function now(): Date {
  return new Date()
}
