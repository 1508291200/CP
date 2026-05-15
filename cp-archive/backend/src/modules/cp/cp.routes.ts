import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createCpSchema, updateCpSchema, cpQuerySchema } from './cp.schema.js'
import * as cpService from './cp.service.js'
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

  return router
}
