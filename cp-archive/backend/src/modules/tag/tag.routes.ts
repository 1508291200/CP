import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createTagSchema, updateTagSchema } from './tag.schema.js'
import * as tagService from './tag.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'

export function buildTagRouter() {
  const router = new Hono()

  router.get('/', async (c) => c.json(success(await tagService.listTags())))

  router.post('/', authMiddleware, permissionMiddleware('tag:manage'),
    zValidator('json', createTagSchema), async (c) => {
      const user = c.get('user')
      return c.json(success(await tagService.createTag(c.req.valid('json'), user.userId)), 201)
    })

  router.patch('/:id', authMiddleware, permissionMiddleware('tag:manage'),
    zValidator('json', updateTagSchema), async (c) =>
      c.json(success(await tagService.updateTag(c.req.param('id')!, c.req.valid('json')))))

  router.delete('/:id', authMiddleware, permissionMiddleware('tag:manage'), async (c) => {
    await tagService.deleteTag(c.req.param('id')!)
    return c.json(success(null))
  })

  return router
}
