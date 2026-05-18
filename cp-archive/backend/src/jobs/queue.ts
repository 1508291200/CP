/**
 * 图片处理任务队列（BullMQ）
 * - 有 Redis：异步队列处理缩略图
 * - 无 Redis（REDIS_URL=disabled）：同步处理
 */
import sharp from 'sharp'
import { getConfig } from '../config/index.js'
import { getDb } from '../db/connection.js'
import { media } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'
import { storagePut } from '../shared/storage.js'

export interface ImageJobData {
  mediaId:    string
  fileBuffer: string   // base64
  thumbKey:   string
}

// ── 核心处理逻辑（共享）────────────────────────────────
export async function processImageJob(data: ImageJobData) {
  const { mediaId, fileBuffer, thumbKey } = data
  const inputBuffer = Buffer.from(fileBuffer, 'base64')

  const outBuffer = await sharp(inputBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })

  await storagePut(thumbKey, outBuffer.data, 'image/webp')

  const db = getDb()
  await db
    .update(media)
    .set({
      thumbPath: thumbKey,
      width:     outBuffer.info.width,
      height:    outBuffer.info.height,
    })
    .where(eq(media.id, mediaId))
}

// ── 队列（懒加载，仅有 Redis 时使用）─────────────────
let _queue: import('bullmq').Queue<ImageJobData> | null = null

export async function getImageQueue() {
  if (_queue) return _queue
  const config = getConfig()
  const { Queue } = await import('bullmq')
  _queue = new Queue<ImageJobData>('image-processing', {
    connection: { host: config.REDIS_HOST, port: config.REDIS_PORT },
  })
  return _queue
}

// ── 启动 Worker（仅有 Redis 时调用）──────────────────
export async function startImageWorker() {
  const config = getConfig()

  if (!config.REDIS_URL || config.REDIS_URL === 'disabled') {
    console.warn('[ImageWorker] Redis not available — thumbnail generation will run synchronously')
    return null
  }

  const { Worker } = await import('bullmq')
  const worker = new Worker<ImageJobData>(
    'image-processing',
    (job) => processImageJob(job.data),
    {
      connection: { host: config.REDIS_HOST, port: config.REDIS_PORT },
      concurrency: 3,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(`[ImageWorker] Job ${job?.id} failed:`, err.message)
  })

  console.log('[ImageWorker] Started')
  return worker
}
