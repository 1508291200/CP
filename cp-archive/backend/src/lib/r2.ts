/**
 * Cloudflare R2 客户端封装
 * 使用 AWS S3 兼容 API（R2 完全兼容 S3 协议）
 *
 * 使用前提：
 *   - 在 Cloudflare 控制台创建 R2 存储桶
 *   - 创建 API Token（R2:Edit 权限），获取 Access Key ID 和 Secret Access Key
 *   - 将存储桶设置为公开，或绑定自定义域名
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getConfig } from '../config/index.js'

let _r2Client: S3Client | null = null

/** 获取 R2 S3 兼容客户端（单例） */
export function getR2Client(): S3Client {
  if (!_r2Client) {
    const config = getConfig()
    _r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      },
    })
  }
  return _r2Client
}

/**
 * 上传 Buffer 到 R2
 * @param key    存储路径，如 "originals/2024/06/uuid.jpg"
 * @param body   文件内容 Buffer
 * @param contentType  MIME 类型
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const config = getConfig()
  const client = getR2Client()

  await client.send(new PutObjectCommand({
    Bucket:      config.R2_BUCKET_NAME,
    Key:         key,
    Body:        body,
    ContentType: contentType,
  }))
}

/**
 * 从 R2 删除对象
 * @param key  存储路径
 */
export async function deleteFromR2(key: string): Promise<void> {
  const config = getConfig()
  const client = getR2Client()

  await client.send(new DeleteObjectCommand({
    Bucket: config.R2_BUCKET_NAME,
    Key:    key,
  }))
}

/**
 * 将 R2 key 转换为公共访问 URL
 * @param key  存储路径，如 "originals/2024/06/uuid.jpg"
 * @returns    如 "https://media.yourdomain.com/originals/2024/06/uuid.jpg"
 */
export function r2KeyToUrl(key: string): string {
  const config = getConfig()
  return `${config.R2_PUBLIC_URL}/${key}`
}
