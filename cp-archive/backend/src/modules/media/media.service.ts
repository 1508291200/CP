/**
 * 媒体模块 - Service 层
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { media } from '../../db/schema/index.js'
import { getImageQueue } from '../../jobs/queue.js'
import { getConfig } from '../../config/index.js'
import { NotFoundError, ForbiddenError } from '../../shared/errors.js'

export async function uploadFile(
  file: Express.Multer.File,
  uploadedBy: string,
): Promise<typeof media.$inferSelect> {
  const db     = getDb()
  const config = getConfig()

  const [record] = await db
    .insert(media)
    .values({
      originalName: file.originalname,
      filePath:     file.path,
      fileType:     'image',
      mimeType:     file.mimetype,
      fileSize:     file.size,
      uploadedBy,
    })
    .returning()

  // 推到队列异步处理缩略图
  const thumbDir = path.join(config.UPLOAD_DIR, 'thumbs',
    path.relative(path.join(config.UPLOAD_DIR, 'originals'), path.dirname(file.path)))

  await getImageQueue().add('process-image', {
    mediaId:      record.id,
    originalPath: file.path,
    thumbDir,
  })

  return record
}

export async function deleteFile(id: string, requesterId: string, requesterRole: string) {
  const db = getDb()
  const [record] = await db.select().from(media).where(eq(media.id, id))
  if (!record) throw new NotFoundError('Media', id)

  // 仅上传者或 admin+ 可删除
  const isAdmin = ['owner', 'admin'].includes(requesterRole)
  if (record.uploadedBy !== requesterId && !isAdmin) {
    throw new ForbiddenError()
  }

  // 删文件（不存在不报错）
  await fs.unlink(record.filePath).catch(() => {})
  if (record.thumbPath) await fs.unlink(record.thumbPath).catch(() => {})

  await db.delete(media).where(eq(media.id, id))
}

export async function getMediaById(id: string) {
  const db = getDb()
  const [record] = await db.select().from(media).where(eq(media.id, id))
  if (!record) throw new NotFoundError('Media', id)
  return record
}

/** 将数据库路径转换为可访问 URL */
export function toPublicUrl(filePath: string | null): string | null {
  if (!filePath) return null
  const config = getConfig()
  // 将本地路径中的 uploadDir 前缀替换为 /uploads/ URL 路径
  const relative = path.relative(config.UPLOAD_DIR, filePath).replace(/\\/g, '/')
  return `${config.PUBLIC_URL}/uploads/${relative}`
}
