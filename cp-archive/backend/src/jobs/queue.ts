/**
 * 图片处理任务队列（BullMQ）
 * Worker 从 buffer (base64) 生成缩略图，通过 storage 抽象层持久化
 */
import { Queue, Worker } from 'bullmq'
import sharp from 'sharp'
import { getConfig } from '../config/index.js'
import { getDb } from '../db/connection.js'
import { media } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'
import { storagePut } from '../shared/storage.js'

export interface ImageJobData {
  mediaId:    string
  fileBuffer: string   // base64
  thumbKey:   string   // 存储 key，如 thumbs/2024/01/uuid_thumb.webp
}

let imageQueue: Queue<ImageJobData> | null = null

export function getImageQueue(): Queue<ImageJobData> {
  if (!imageQueue) {
    const config = getConfig()
    imageQueue = new Queue<ImageJobData>('image-processing', {
      connection: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
      },
    })
  }
  return imageQueue
}

export function startImageWorker() {
  const config = getConfig()

  const worker = new Worker<ImageJobData>(
    'image-processing',
    async (job) => {
      const { mediaId, fileBuffer, thumbKey } = job.data

      const inputBuffer = Buffer.from(fileBuffer, 'base64')

      // Sharp 处理：宽度 800px，WebP 格式
      const outBuffer = await sharp(inputBuffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true })

      // 上传缩略图到存储层
      await storagePut(thumbKey, outBuffer.data, 'image/webp')

      // 更新数据库
      const db = getDb()
      await db
        .update(media)
        .set({
          thumbPath: thumbKey,
          width:     outBuffer.info.width,
          height:    outBuffer.info.height,
        })
        .where(eq(media.id, mediaId))
    },
    {
      connection: {
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
      },
      concurrency: 3,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`[ImageWorker] Job ${job?.id} failed:`, err.message)
  })

  return worker
}
