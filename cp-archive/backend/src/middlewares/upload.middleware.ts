/**
 * 文件上传中间件（Multer 配置）
 * 白名单校验 + 内存存储（文件先读入内存，再由 media.service 上传到 R2 或本地磁盘）
 *
 * 注意：改为内存存储后，file.buffer 包含文件内容，file.path 不再可用。
 */
import multer from 'multer'
import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { getConfig } from '../config/index.js'
import { AppError } from '../shared/errors.js'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * multer 实例：统一使用内存存储。
 * - R2 模式：buffer 直接上传到 R2，无磁盘写入
 * - 本地模式：buffer 写入磁盘（在 media.service 中处理）
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new AppError('INVALID_FILE_TYPE', `不支持的文件类型: ${file.mimetype}`, 400))
      return
    }
    cb(null, true)
  },
})

/** 为本地存储模式创建目录（仅 R2_ENABLED=false 时需要） */
export async function ensureUploadDirs() {
  const config = getConfig()
  if (config.R2_ENABLED) return // R2 模式不需要本地目录

  const dirs = [
    path.join(config.UPLOAD_DIR, 'originals'),
    path.join(config.UPLOAD_DIR, 'thumbs'),
  ]
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true })
  }
}
