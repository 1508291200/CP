/**
 * 媒体模块 - Service 层
 * 存储由 shared/storage 抽象层处理，支持本地 / R2
 */
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { media } from '../../db/schema/index.js'
import { getImageQueue } from '../../jobs/queue.js'
import { storagePut, storageRemove, storagePublicUrl } from '../../shared/storage.js'
import { NotFoundError, ForbiddenError } from '../../shared/errors.js'
import { getConfig } from '../../config/index.js'

export async function uploadFile(
  file: Express.Multer.File,
  uploadedBy: string,
): Promise<typeof media.$inferSelect> {
  const db     = getDb()
  const config = getConfig()

  // 生成存储 key（按日期组织）
  const now   = new Date()
  const year  = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const ext   = path.extname(file.originalname).toLowerCase()
  const uuid  = randomUUID()
  const key   = `originals/${year}/${month}/${uuid}${ext}`

  // 上传原文件
  const fileBuffer = file.buffer
  if (!fileBuffer) throw new Error('文件内容为空，请检查 multer 配置（需 memoryStorage）')

  await storagePut(key, fileBuffer, file.mimetype)

  const [record] = await db
    .insert(media)
    .values({
      originalName: file.originalname,
      filePath:     key,          // 存储 key，非绝对路径
      fileType:     'image',
      mimeType:     file.mimetype,
      fileSize:     file.size,
      uploadedBy,
    })
    .returning()

  // 仅在启用 Redis 时异步生成缩略图（本地开发或有 Redis 时）
  if (config.REDIS_URL && config.REDIS_URL !== 'disabled') {
    const thumbKey = `thumbs/${year}/${month}/${uuid}_thumb.webp`
    await getImageQueue().add('process-image', {
      mediaId:      record.id,
      fileBuffer:   fileBuffer.toString('base64'),
      thumbKey,
    })
  }

  return record
}

export async function deleteFile(id: string, requesterId: string, requesterRole: string) {
  const db = getDb()
  const [record] = await db.select().from(media).where(eq(media.id, id))
  if (!record) throw new NotFoundError('Media', id)

  const isAdmin = ['owner', 'admin'].includes(requesterRole)
  if (record.uploadedBy !== requesterId && !isAdmin) {
    throw new ForbiddenError()
  }

  await storageRemove(record.filePath)
  if (record.thumbPath) await storageRemove(record.thumbPath)

  await db.delete(media).where(eq(media.id, id))
}

export async function getMediaById(id: string) {
  const db = getDb()
  const [record] = await db.select().from(media).where(eq(media.id, id))
  if (!record) throw new NotFoundError('Media', id)
  return record
}

/** 将存储 key 转为可访问的公开 URL */
export function toPublicUrl(key: string | null): string | null {
  if (!key) return null
  return storagePublicUrl(key)
}
