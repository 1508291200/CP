/**
 * 存储抽象层
 * 通过 STORAGE_DRIVER 环境变量切换本地磁盘 / Cloudflare R2
 *
 * 接口：
 *   put(key, buffer, mimeType) → publicUrl
 *   remove(key)
 *   publicUrl(key) → string
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { getConfig } from '../config/index.js'

// ── S3 / R2 懒加载（仅在 r2 模式下 import）────────────
async function getS3Client() {
  const { S3Client } = await import('@aws-sdk/client-s3')
  const config = getConfig()
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  })
}

// ── 上传 ──────────────────────────────────────────────

export async function storagePut(
  key: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const config = getConfig()

  if (config.STORAGE_DRIVER === 'r2') {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3')
    const client = await getS3Client()
    await client.send(new PutObjectCommand({
      Bucket:      config.R2_BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
    }))
    return storagePublicUrl(key)
  }

  // local
  const fullPath = path.join(config.UPLOAD_DIR, key)
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, buffer)
  return storagePublicUrl(key)
}

// ── 删除 ──────────────────────────────────────────────

export async function storageRemove(key: string): Promise<void> {
  const config = getConfig()

  if (config.STORAGE_DRIVER === 'r2') {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    const client = await getS3Client()
    await client.send(new DeleteObjectCommand({
      Bucket: config.R2_BUCKET,
      Key:    key,
    }))
    return
  }

  // local
  const fullPath = path.join(config.UPLOAD_DIR, key)
  await fs.unlink(fullPath).catch(() => {})
}

// ── 公开 URL ──────────────────────────────────────────

export function storagePublicUrl(key: string): string {
  const config = getConfig()
  if (config.STORAGE_DRIVER === 'r2') {
    const base = config.R2_PUBLIC_URL.replace(/\/$/, '')
    return `${base}/${key}`
  }
  const base = config.PUBLIC_URL.replace(/\/$/, '')
  return `${base}/uploads/${key}`
}
