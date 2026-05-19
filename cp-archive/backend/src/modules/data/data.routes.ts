import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import * as exportService from './export.service.js'
import * as importService from './import.service.js'
import { success } from '../../shared/response.js'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'
import { ValidationError } from '../../shared/errors.js'

// Multer is not used here – Hono natively handles formData
export function buildDataRouter() {
  const router = new Hono()

  // ── 导出全站 ────────────────────────────────────────────
  router.get('/export/full', permissionMiddleware('data:export'), async (c) => {
    const payload = await exportService.exportFull()
    const json    = JSON.stringify(payload, null, 2)
    const date    = new Date().toISOString().slice(0, 10)

    return new Response(json, {
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="cp-archive-full-${date}.json"`,
      },
    })
  })

  // ── 导出单 CP ───────────────────────────────────────────
  router.get('/export/:cpId', permissionMiddleware('data:export'), async (c) => {
    const cpId   = c.req.param('cpId')!
    const payload = await exportService.exportCp(cpId)
    const json    = JSON.stringify(payload, null, 2)
    const date    = new Date().toISOString().slice(0, 10)

    return new Response(json, {
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="cp-${cpId}-${date}.json"`,
      },
    })
  })

  // ── 导入数据 ────────────────────────────────────────────
  router.post(
    '/import',
    permissionMiddleware('data:import'),
    zValidator('query', z.object({ mode: z.enum(['merge', 'overwrite']).default('merge') })),
    async (c) => {
      const { mode } = c.req.valid('query')
      const { userId } = c.get('user')

      // 接收 JSON body（可以是 multipart 文件或直接 JSON）
      const contentType = c.req.header('content-type') ?? ''

      let raw: unknown
      if (contentType.includes('multipart/form-data')) {
        const formData = await c.req.formData()
        const file = formData.get('file')
        if (!file || typeof file === 'string') throw new ValidationError('file field is required')
        const text = await (file as File).text()
        try { raw = JSON.parse(text) } catch { throw new ValidationError('Invalid JSON file') }
      } else {
        try { raw = await c.req.json() } catch { throw new ValidationError('Invalid JSON body') }
      }

      const result = await importService.importData(raw, mode, userId)
      return c.json(success(result), 200)
    },
  )

  // ── 危险：清空全站数据 ─────────────────────────────────
  router.delete('/data', permissionMiddleware('settings:site'), async (c) => {
    const db = (await import('../../db/connection.js')).getDb()
    const { eventTags, cpTags, milestones, events, characters, cps, tags } =
      await import('../../db/schema/index.js')

    await db.transaction(async (tx) => {
      await tx.delete(eventTags)
      await tx.delete(cpTags)
      await tx.delete(milestones)
      await tx.delete(events)
      await tx.delete(characters)
      await tx.delete(cps)
      await tx.delete(tags)
    })
    return c.json(success({ deleted: true }))
  })

  return router
}
