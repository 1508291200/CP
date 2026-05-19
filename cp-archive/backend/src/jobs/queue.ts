/**
 * 图片处理任务队列（BullMQ）
 * 与 Redis 连接，创建 image-processing 队列
 */
import { Queue, Worker } from 'bullmq'
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs/promises'
import { getConfig } from '../config/index.js'
import { getDb } from '../db/connection.js'
import { media } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'

export interface ImageJobData {
  mediaId:      string
  originalPath: string
  thumbDir:     string
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
      const { mediaId, originalPath, thumbDir } = job.data

      // 生成缩略图路径（同目录层级，thumbs 文件夹）
      const ext      = path.extname(originalPath)
      const basename = path.basename(originalPath, ext)
      const thumbPath = path.join(thumbDir, `${basename}_thumb.webp`)

      // 确保目录存在
      await fs.mkdir(thumbDir, { recursive: true })

      // Sharp 处理：宽度 800px，WebP 格式
      const meta = await sharp(originalPath)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(thumbPath)

      // 更新数据库记录
      const db = getDb()
      await db
        .update(media)
        .set({
          thumbPath,
          width:  meta.width,
          height: meta.height,
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
