/**
 * 媒体模块 - Service 层
 * 存储由 shared/storage 抽象层处理，支持本地 / R2
 * 缩略图：有 Redis 则异步队列，无 Redis 则同步处理
 */
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { media } from '../../db/schema/index.js'
import { getImageQueue, processImageJob } from '../../jobs/queue.js'
import { storagePut, storageRemove, storagePublicUrl } from '../../shared/storage.js'
import { NotFoundError, ForbiddenError } from '../../shared/errors.js'
import { getConfig } from '../../config/index.js'

export async function uploadFile(
  file: Express.Multer.File,
  uploadedBy: string,
): Promise<typeof media.$inferSelect> {
  const db     = getDb()
  const config = getConfig()

  const now   = new Date()
  const year  = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const ext   = path.extname(file.originalname).toLowerCase()
  const uuid  = randomUUID()
  const key   = `originals/${year}/${month}/${uuid}${ext}`

  const fileBuffer = file.buffer
  if (!fileBuffer) throw new Error('文件内容为空，请检查 multer 配置（需 memoryStorage）')

  await storagePut(key, fileBuffer, file.mimetype)

  const [record] = await db
    .insert(media)
    .values({
      originalName: file.originalname,
      filePath:     key,
      fileType:     'image',
      mimeType:     file.mimetype,
      fileSize:     file.size,
      uploadedBy,
    })
    .returning()

  const thumbKey = `thumbs/${year}/${month}/${uuid}_thumb.webp`
  const jobData  = { mediaId: record.id, fileBuffer: fileBuffer.toString('base64'), thumbKey }

  const hasRedis = config.REDIS_URL && config.REDIS_URL !== 'disabled'
  if (hasRedis) {
    // 异步队列
    const queue = await getImageQueue()
    await queue.add('process-image', jobData)
  } else {
    // 无 Redis：同步处理（开发模式，不阻塞太久）
    processImageJob(jobData).catch((err: Error) =>
      console.error('[Media] Thumbnail generation failed:', err.message),
    )
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

export function toPublicUrl(key: string | null): string | null {
  if (!key) return null
  return storagePublicUrl(key)
}
