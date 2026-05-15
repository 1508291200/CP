/**
 * 文件上传中间件（Multer 配置）
 * 白名单校验 + 磁盘存储 + 路径按日期组织
 */
import multer from 'multer'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { getConfig } from '../config/index.js'
import { AppError } from '../shared/errors.js'

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

function buildUploadPath(): string {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const config = getConfig()
  return path.join(config.UPLOAD_DIR, 'originals', String(year), month)
}

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, buildUploadPath())
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      cb(null, `${randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new AppError('INVALID_FILE_TYPE', `不支持的文件类型: ${file.mimetype}`, 400))
      return
    }
    cb(null, true)
  },
})

/** 为上传路径创建目录（应用启动时调用） */
export async function ensureUploadDirs() {
  const { mkdirSync } = await import('node:fs')
  const config = getConfig()
  const dirs = [
    path.join(config.UPLOAD_DIR, 'originals'),
    path.join(config.UPLOAD_DIR, 'thumbs'),
  ]
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true })
  }
}
