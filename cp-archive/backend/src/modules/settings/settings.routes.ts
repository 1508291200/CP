/**
 * 站点设置路由
 * GET  /settings         - 读取所有设置（任何已登录用户）
 * PATCH /settings        - 更新设置（admin+）
 */
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'
import { getAllSettings, patchSettings } from './settings.service.js'
import { success } from '../../shared/response.js'

const patchSchema = z.record(z.unknown())

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

  return app
}
