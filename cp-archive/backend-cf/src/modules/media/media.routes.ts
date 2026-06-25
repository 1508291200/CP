/**
 * 媒体上传路由 — Cloudflare Workers + 腾讯云 COS（私有读 + 预签名 URL）
 *
 * 流程：
 *  1. POST /media/upload  → 上传文件到 COS（私有），返回预签名 URL（默认 1 小时有效）
 *  2. GET  /media/:id/url → 用 cosKey 刷新预签名 URL（前端图片加载前调用）
 *  3. DELETE /media/:id   → 从 COS 删除并移除 DB 记录
 *
 * 注意：DB 中的 r2_key 字段存储 COS 对象 key，预签名 URL 不入库（每次动态生成）
 */
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { getDb } from '../../db/connection.js'
import { media } from '../../db/schema/index.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/permission.middleware.js'
import { success } from '../../shared/response.js'
import { AppError, ForbiddenError } from '../../shared/errors.js'
import { newId } from '../../utils/id.js'
import { hasRole } from '../../middlewares/permission.middleware.js'
import { uploadToCos, deleteFromCos, buildCosKey, generatePresignedUrl } from '../../lib/cos.js'
import type { Env } from '../../types/env.js'

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/avif', 'video/mp4', 'video/webm',
])
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/** 从 env 读取有效期配置，默认 3600 秒（1 小时） */
function getExpiresIn(env: Env): number {
  const n = parseInt(env.COS_URL_EXPIRES ?? '3600', 10)
  return isNaN(n) || n <= 0 ? 3600 : n
}

const mediaRouter = new Hono<{ Bindings: Env }>()
mediaRouter.use('*', authMiddleware)

// ── POST /media/upload ──────────────────────────────────────────────────────
mediaRouter.post('/upload', requireRole('editor'), async (c) => {
  const formData = await c.req.formData().catch(() => null)
  if (!formData) throw new AppError('INVALID_FORM', '无效的表单数据', 400)

  const fileEntry = formData.get('file')
  if (!fileEntry || !(fileEntry instanceof File)) {
    throw new AppError('NO_FILE', '未收到文件', 400)
  }

  const mimeType = fileEntry.type || 'application/octet-stream'
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new AppError('INVALID_MIME', `不支持的文件类型：${mimeType}`, 400)
  }

  if (fileEntry.size > MAX_FILE_SIZE) {
    throw new AppError('FILE_TOO_LARGE', '文件大小超过限制（最大 50MB）', 400)
  }

  const ext      = fileEntry.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const cosKey   = buildCosKey(mimeType, ext)
  const fileType = mimeType.startsWith('video') ? 'video' : 'image'

  // 上传到腾讯云 COS（私有存储桶）
  const arrayBuffer = await fileEntry.arrayBuffer()
  await uploadToCos({
    bucket:      c.env.COS_BUCKET,
    region:      c.env.COS_REGION,
    key:         cosKey,
    body:        arrayBuffer,
    contentType: mimeType,
    secretId:    c.env.COS_SECRET_ID,
    secretKey:   c.env.COS_SECRET_KEY,
  })

  // 写 DB 记录（存 cosKey，不存 URL）
  const db = getDb(c.env.DB)
  const id = newId()
  await db.insert(media).values({
    id,
    originalName: fileEntry.name,
    r2Key:        cosKey,
    fileType,
    mimeType,
    fileSize:   fileEntry.size,
    uploadedBy: c.get('user').userId,
    createdAt:  new Date(),
  })

  // 生成预签名 URL 返回给前端
  const expiresIn = getExpiresIn(c.env)
  const url = await generatePresignedUrl({
    bucket:    c.env.COS_BUCKET,
    region:    c.env.COS_REGION,
    key:       cosKey,
    secretId:  c.env.COS_SECRET_ID,
    secretKey: c.env.COS_SECRET_KEY,
    expiresIn,
  })

  return c.json(success({ id, url, expiresIn, mimeType, fileSize: fileEntry.size }), 201)
})

// ── GET /media/:id/url（刷新预签名 URL）──────────────────────────────────────
// 前端在图片 URL 过期前调用此接口刷新 URL
mediaRouter.get('/:id/url', async (c) => {
  const db = getDb(c.env.DB)

  const [record] = await db.select().from(media).where(eq(media.id, c.req.param('id')))
  if (!record) throw new AppError('NOT_FOUND', '文件不存在', 404)

  const expiresIn = getExpiresIn(c.env)
  const url = await generatePresignedUrl({
    bucket:    c.env.COS_BUCKET,
    region:    c.env.COS_REGION,
    key:       record.r2Key,
    secretId:  c.env.COS_SECRET_ID,
    secretKey: c.env.COS_SECRET_KEY,
    expiresIn,
  })

  return c.json(success({ id: record.id, url, expiresIn }))
})

// ── DELETE /media/:id ────────────────────────────────────────────────────────
mediaRouter.delete('/:id', async (c) => {
  const user = c.get('user')
  const db   = getDb(c.env.DB)

  const [record] = await db.select().from(media).where(eq(media.id, c.req.param('id')))
  if (!record) throw new AppError('NOT_FOUND', '文件不存在', 404)

  if (record.uploadedBy !== user.userId && !hasRole(user.role, 'admin')) {
    throw new ForbiddenError('无权删除此文件')
  }

  // 从 COS 删除
  await deleteFromCos({
    bucket:    c.env.COS_BUCKET,
    region:    c.env.COS_REGION,
    key:       record.r2Key,
    secretId:  c.env.COS_SECRET_ID,
    secretKey: c.env.COS_SECRET_KEY,
  })

  // 从 DB 删除
  await db.delete(media).where(eq(media.id, c.req.param('id')))

  return c.json(success(null))
})

export { mediaRouter as mediaRoutes }
