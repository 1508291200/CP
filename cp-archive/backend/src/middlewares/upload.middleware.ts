/**
 * 文件上传中间件（Multer 配置）
 * 白名单校验 + 内存存储（文件由 storage 抽象层负责持久化）
 */
import multer from 'multer'
import { AppError } from '../shared/errors.js'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

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

/** 保持向后兼容：本地模式下确保目录存在（不影响 r2 模式） */
export async function ensureUploadDirs() {
  const { getConfig } = await import('../config/index.js')
  const config = getConfig()
  if (config.STORAGE_DRIVER !== 'local') return

  const { mkdirSync } = await import('node:fs')
  const path = await import('node:path')
  const dirs = [
    path.join(config.UPLOAD_DIR, 'originals'),
    path.join(config.UPLOAD_DIR, 'thumbs'),
  ]
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true })
  }
}
