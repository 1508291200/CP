/**
 * 图片处理任务队列（BullMQ）
 * 与 Redis 连接，创建 image-processing 队列
 *
 * 支持两种模式（由 r2Enabled 字段控制）：
 *   R2 模式：原图 buffer (base64) → Sharp 内存处理 → 上传缩略图到 R2 → 更新 DB thumbPath(key)
 *   本地模式：读取本地原图路径 → Sharp 写磁盘 → 更新 DB thumbPath(绝对路径)
 */
import { Queue, Worker } from 'bullmq'
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs/promises'
import { getConfig } from '../config/index.js'
import { getDb } from '../db/connection.js'
import { media } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'
import { uploadToR2, r2KeyToUrl } from '../lib/r2.js'

export interface ImageJobData {
  mediaId: string
  /** R2 模式：原图 buffer 的 base64 编码 */
  originalBuffer: string | null
  /** 本地模式：原图绝对路径 */
  originalPath: string | null
  r2Enabled: boolean
  /** 用于生成 R2 缩略图 key（年/月/uuid） */
  year:  string
  month: string
  uuid:  string
}

/** 根据 REDIS_URL 解析出 BullMQ connection 配置，支持 rediss:// TLS */
function getBullMQConnection() {
  const config = getConfig()
  const url = new URL(config.REDIS_URL)
  const tls = url.protocol === 'rediss:'
  return {
    host:     url.hostname,
    port:     parseInt(url.port || '6379', 10),
    username: url.username || undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    tls:      tls ? {} : undefined,
  }
}

let imageQueue: Queue<ImageJobData> | null = null

export function getImageQueue(): Queue<ImageJobData> {
  if (!imageQueue) {
    imageQueue = new Queue<ImageJobData>('image-processing', {
      connection: getBullMQConnection(),
    })
  }
  return imageQueue
}

/**
 * 启动 Worker（在应用启动时调用一次）
 */
export function startImageWorker() {
  const config = getConfig()

  const worker = new Worker<ImageJobData>(
    'image-processing',
    async (job) => {
      const { mediaId, r2Enabled, year, month, uuid } = job.data

      // Sharp 处理：宽度 800px，WebP 格式，输出到 Buffer
      let inputBuffer: Buffer

      if (r2Enabled) {
        // R2 模式：从 base64 还原原图 buffer
        if (!job.data.originalBuffer) throw new Error('originalBuffer is required in R2 mode')
        inputBuffer = Buffer.from(job.data.originalBuffer, 'base64')
      } else {
        // 本地模式：从磁盘读取原图
        if (!job.data.originalPath) throw new Error('originalPath is required in local mode')
        inputBuffer = await fs.readFile(job.data.originalPath)
      }

      const thumbBuffer = await sharp(inputBuffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()

      let thumbStoredPath: string
      let thumbWidth: number | undefined
      let thumbHeight: number | undefined

      // 从 sharp 获取元数据
      const meta = await sharp(thumbBuffer).metadata()
      thumbWidth  = meta.width
      thumbHeight = meta.height

      if (r2Enabled) {
        // R2 模式：上传缩略图 buffer 到 R2
        const thumbKey = `thumbs/${year}/${month}/${uuid}_thumb.webp`
        await uploadToR2(thumbKey, thumbBuffer, 'image/webp')
        thumbStoredPath = thumbKey
      } else {
        // 本地模式：写缩略图到磁盘
        if (!job.data.originalPath) throw new Error('originalPath is required in local mode')
        const thumbDir = path.join(
          config.UPLOAD_DIR, 'thumbs', year, month,
        )
        await fs.mkdir(thumbDir, { recursive: true })
        const thumbPath = path.join(thumbDir, `${uuid}_thumb.webp`)
        await fs.writeFile(thumbPath, thumbBuffer)
        thumbStoredPath = thumbPath
      }

      // 更新数据库记录
      const db = getDb()
      await db
        .update(media)
        .set({
          thumbPath: thumbStoredPath,
          width:     thumbWidth,
          height:    thumbHeight,
        })
        .where(eq(media.id, mediaId))
    },
    {
      connection: getBullMQConnection(),
      concurrency: 3,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`[ImageWorker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
