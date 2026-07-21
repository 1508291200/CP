/**
 * 媒体模块 - Service 层
 *
 * 存储策略由 R2_ENABLED 环境变量控制：
 *   true  → 文件上传到 Cloudflare R2，filePath 存储 R2 key（如 "originals/2024/06/uuid.jpg"）
 *   false → 文件写入本地磁盘，filePath 存储绝对路径（兼容旧行为）
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { media } from '../../db/schema/index.js'
import { getImageQueue } from '../../jobs/queue.js'
import { getConfig } from '../../config/index.js'
import { NotFoundError, ForbiddenError } from '../../shared/errors.js'
import { uploadToR2, deleteFromR2, r2KeyToUrl } from '../../lib/r2.js'

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

  let storedFilePath: string

  if (config.R2_ENABLED) {
    // ── R2 模式：上传 buffer 到 R2 ─────────────────
    const r2Key = `originals/${year}/${month}/${uuid}${ext}`
    await uploadToR2(r2Key, file.buffer, file.mimetype)
    storedFilePath = r2Key  // 数据库存 R2 key
  } else {
    // ── 本地模式：写 buffer 到磁盘 ─────────────────
    const dir = path.join(config.UPLOAD_DIR, 'originals', String(year), month)
    await fs.mkdir(dir, { recursive: true })
    const localPath = path.join(dir, `${uuid}${ext}`)
    await fs.writeFile(localPath, file.buffer)
    storedFilePath = localPath
  }

  const [record] = await db
    .insert(media)
    .values({
      originalName: file.originalname,
      filePath:     storedFilePath,
      fileType:     'image',
      mimeType:     file.mimetype,
      fileSize:     file.size,
      uploadedBy,
    })
    .returning()

  // 推到队列异步处理缩略图
  await getImageQueue().add('process-image', {
    mediaId:      record.id,
    originalBuffer: config.R2_ENABLED ? file.buffer.toString('base64') : null,
    originalPath:   config.R2_ENABLED ? null : storedFilePath,
    r2Enabled:    config.R2_ENABLED,
    year:         String(year),
    month,
    uuid,
  })

  return record
}

export async function deleteFile(id: string, requesterId: string, requesterRole: string) {
  const db     = getDb()
  const config = getConfig()

  const [record] = await db.select().from(media).where(eq(media.id, id))
  if (!record) throw new NotFoundError('Media', id)

  // 仅上传者或 admin+ 可删除
  const isAdmin = ['owner', 'admin'].includes(requesterRole)
  if (record.uploadedBy !== requesterId && !isAdmin) {
    throw new ForbiddenError()
  }

  if (config.R2_ENABLED) {
    // R2 模式：filePath 和 thumbPath 是 R2 key
    await deleteFromR2(record.filePath).catch(() => {})
    if (record.thumbPath) await deleteFromR2(record.thumbPath).catch(() => {})
  } else {
    // 本地模式：filePath 和 thumbPath 是绝对路径
    await fs.unlink(record.filePath).catch(() => {})
    if (record.thumbPath) await fs.unlink(record.thumbPath).catch(() => {})
  }

  await db.delete(media).where(eq(media.id, id))
}

export async function getMediaById(id: string) {
  const db = getDb()
  const [record] = await db.select().from(media).where(eq(media.id, id))
  if (!record) throw new NotFoundError('Media', id)
  return record
}

/**
 * 将数据库存储路径/key 转换为可访问的公共 URL
 * - R2 模式：key → R2_PUBLIC_URL/key
 * - 本地模式：绝对路径 → PUBLIC_URL/uploads/相对路径
 */
export function toPublicUrl(filePath: string | null): string | null {
  if (!filePath) return null
  const config = getConfig()

  if (config.R2_ENABLED) {
    return r2KeyToUrl(filePath)
  }

  // 本地模式
  const relative = path.relative(config.UPLOAD_DIR, filePath).replace(/\\/g, '/')
  return `${config.PUBLIC_URL}/uploads/${relative}`
}
