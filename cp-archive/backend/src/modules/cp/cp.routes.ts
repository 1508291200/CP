import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createCpSchema, updateCpSchema, cpQuerySchema } from './cp.schema.js'
import * as cpService from './cp.service.js'
import * as tabService from './cp.tabs.service.js'
import { success } from '../../shared/response.js'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'

export function buildCpRouter() {
  const router = new Hono()

  router.get('/', zValidator('query', cpQuerySchema), async (c) => {
    const result = await cpService.listCps(c.req.valid('query'))
    return c.json(success(result.items, result.meta))
  })

  router.post('/', permissionMiddleware('cp:create'),
    zValidator('json', createCpSchema), async (c) =>
      c.json(success(await cpService.createCp(c.req.valid('json'), c.get('user').userId)), 201))

  router.get('/:id', async (c) =>
    c.json(success(await cpService.getCpById(c.req.param('id')!))))

  router.patch('/:id', permissionMiddleware('cp:update'),
    zValidator('json', updateCpSchema), async (c) =>
      c.json(success(await cpService.updateCp(c.req.param('id')!, c.req.valid('json')))))

  router.delete('/:id', permissionMiddleware('cp:delete'), async (c) => {
    await cpService.deleteCp(c.req.param('id')!)
    return c.json(success(null))
  })

  // ── 自定义 Tab ────────────────────────────────────────────
  router.get('/:id/tabs', async (c) =>
    c.json(success(await tabService.listTabs(c.req.param('id')!))))

  router.post('/:id/tabs', permissionMiddleware('cp:update'),
    zValidator('json', tabService.createTabSchema), async (c) =>
      c.json(success(await tabService.createTab(c.req.param('id')!, c.req.valid('json'))), 201))

  router.patch('/:id/tabs/:tabId', permissionMiddleware('cp:update'),
    zValidator('json', tabService.updateTabSchema), async (c) =>
      c.json(success(await tabService.updateTab(c.req.param('id')!, c.req.param('tabId')!, c.req.valid('json')))))

  router.delete('/:id/tabs/:tabId', permissionMiddleware('cp:update'), async (c) => {
    await tabService.deleteTab(c.req.param('id')!, c.req.param('tabId')!)
    return c.json(success(null))
  })

  router.patch('/:id/tabs/reorder', permissionMiddleware('cp:update'),
    zValidator('json', z.object({ ids: z.array(z.string().uuid()) })),
    async (c) => {
      await tabService.reorderTabs(c.req.param('id')!, c.req.valid('json').ids)
      return c.json(success(null))
    },
  )

  return router
}
