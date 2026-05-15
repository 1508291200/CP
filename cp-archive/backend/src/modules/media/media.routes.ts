/**
 * 媒体模块路由
 * POST /media/upload  - 上传图片（contributor+）
 * DELETE /media/:id   - 删除文件（上传者或 admin+）
 *
 * 注意：Hono 运行在 @hono/node-server 时可通过 c.env.incoming 访问原生 req。
 * Multer 需要 Node.js 原生 req/res 对象，因此在这里做适配。
 */
import { Hono } from 'hono'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'
import { uploadFile, deleteFile, toPublicUrl } from './media.service.js'
import { upload, ensureUploadDirs } from '../../middlewares/upload.middleware.js'
import { success, failure } from '../../shared/response.js'
import { AppError } from '../../shared/errors.js'

// 确保目录在模块加载时已创建
await ensureUploadDirs()

export function buildMediaRouter() {
  const app = new Hono()

  /**
   * POST /media/upload
   * Content-Type: multipart/form-data  field: file (image)
   */
  app.post('/upload', permissionMiddleware('event:create'), async (c) => {
    const user = c.get('user') as { userId: string; role: string }

    // @hono/node-server 将原生 req/res 暴露在 c.env
    const incoming = (c.env as { incoming?: IncomingMessage })?.incoming
    const outgoing = (c.env as { outgoing?: ServerResponse })?.outgoing

    if (!incoming || !outgoing) {
      return c.json(failure('UPLOAD_ENV_ERROR', '上传环境不可用'), 500)
    }

    try {
      const file = await new Promise<Express.Multer.File>((resolve, reject) => {
        upload.single('file')(incoming as never, outgoing as never, (err) => {
          if (err) return reject(err)
          const incomingWithFile = incoming as never as { file?: Express.Multer.File }
          if (!incomingWithFile.file) {
            return reject(new AppError('NO_FILE', '未收到文件', 400))
          }
          resolve(incomingWithFile.file)
        })
      })

      const record = await uploadFile(file, user.userId)

      return c.json(success({
        id:       record.id,
        url:      toPublicUrl(record.filePath),
        thumbUrl: toPublicUrl(record.thumbPath),
        mimeType: record.mimeType,
        fileSize: record.fileSize,
      }), 201)
    } catch (err) {
      if (err instanceof AppError) {
        return c.json(failure(err.code, err.message), err.statusCode as 400 | 401 | 403 | 404 | 500)
      }
      throw err
    }
  })

  /** DELETE /media/:id */
  app.delete('/:id', async (c) => {
    const user = c.get('user') as { userId: string; role: string }
    await deleteFile(c.req.param('id'), user.userId, user.role)
    return c.json(success(null))
  })

  return app
}
