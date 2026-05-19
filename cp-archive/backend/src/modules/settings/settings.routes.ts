/**
 * 站点设置路由
 * GET  /settings              - 读取所有设置（任何已登录用户）
 * PATCH /settings             - 更新设置（admin+）
 * GET  /settings/templates    - 读取事件模板（任何已登录用户）
 * POST /settings/templates    - 保存事件模板（admin+）
 * DELETE /settings/templates/:name - 删除模板（admin+）
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'
import { getAllSettings, patchSettings, getSetting, setSetting } from './settings.service.js'
import { success } from '../../shared/response.js'

const patchSchema = z.record(z.unknown())

const templateSchema = z.object({
  name:         z.string().min(1).max(100),
  importance:   z.enum(['critical', 'high', 'medium', 'normal', 'low']).optional().default('normal'),
  emotionIcon:  z.string().max(50).optional(),
  contentHint:  z.string().optional(),  // 内容占位提示
  tagIds:       z.array(z.string().uuid()).optional().default([]),
})

export type EventTemplate = z.infer<typeof templateSchema>

export function buildSettingsRouter() {
  const app = new Hono()

  /** GET /settings */
  app.get('/', async (c) => {
    const settings = await getAllSettings()
    return c.json(success(settings))
  })

  /** PATCH /settings */
  app.patch(
    '/',
    permissionMiddleware('settings:site'),
    zValidator('json', patchSchema),
    async (c) => {
      const user    = c.get('user') as { userId: string }
      const updates = c.req.valid('json')
      await patchSettings(updates, user.userId)
      const settings = await getAllSettings()
      return c.json(success(settings))
    },
  )

  /** GET /settings/templates */
  app.get('/templates', async (c) => {
    const raw = await getSetting('event_templates')
    const templates = Array.isArray(raw) ? raw : []
    return c.json(success(templates))
  })

  /** POST /settings/templates — 新增或覆盖同名模板 */
  app.post('/templates', permissionMiddleware('settings:theme'),
    zValidator('json', templateSchema), async (c) => {
      const user     = c.get('user') as { userId: string }
      const newTpl   = c.req.valid('json') as EventTemplate
      const raw      = await getSetting('event_templates')
      const existing = (Array.isArray(raw) ? raw : []) as EventTemplate[]
      const idx      = existing.findIndex(t => t.name === newTpl.name)
      if (idx !== -1) existing[idx] = newTpl
      else existing.push(newTpl)
      await setSetting('event_templates', existing, user.userId)
      return c.json(success(existing), 200)
    },
  )

  /** DELETE /settings/templates/:name */
  app.delete('/templates/:name', permissionMiddleware('settings:theme'), async (c) => {
    const user = c.get('user') as { userId: string }
    const name = c.req.param('name')
    const raw  = await getSetting('event_templates')
    const list = (Array.isArray(raw) ? raw : []) as EventTemplate[]
    const filtered = list.filter((t: EventTemplate) => t.name !== name)
    await setSetting('event_templates', filtered, user.userId)
    return c.json(success(filtered))
  })

  return app
}
