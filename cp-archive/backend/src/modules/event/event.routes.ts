import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { createEventSchema, updateEventSchema, eventQuerySchema } from './event.schema.js'
import * as eventService from './event.service.js'
import { success } from '../../shared/response.js'
import { cpPermissionMiddleware } from '../../middlewares/cp-permission.middleware.js'

export function buildEventRouter() {
  const router = new Hono()

  router.get('/', zValidator('query', eventQuerySchema), async (c) => {
    const result = await eventService.listEvents(c.req.param('cpId')!, c.req.valid('query'))
    return c.json(success(result.items, result.meta))
  })

  router.post('/', cpPermissionMiddleware('event:create'),
    zValidator('json', createEventSchema), async (c) =>
      c.json(
        success(await eventService.createEvent(c.req.param('cpId')!, c.req.valid('json'), c.get('user').userId)),
        201,
      ))

  // ── 批量操作（在 /:id 之前注册，防止路由冲突） ────────────
  router.patch('/batch', cpPermissionMiddleware('event:edit:own'),
    zValidator('json', z.object({
      ids:           z.array(z.string().uuid()).min(1),
      importance:    z.enum(['critical', 'high', 'medium', 'normal', 'low']).optional(),
      addTagIds:     z.array(z.string().uuid()).optional(),
      removeTagIds:  z.array(z.string().uuid()).optional(),
    })),
    async (c) => {
      const result = await eventService.batchUpdateEvents(c.req.param('cpId')!, c.req.valid('json'))
      return c.json(success(result))
    },
  )

  router.delete('/batch', cpPermissionMiddleware('event:delete:own'),
    zValidator('json', z.object({ ids: z.array(z.string().uuid()).min(1) })),
    async (c) => {
      const { ids } = c.req.valid('json')
      const result = await eventService.batchDeleteEvents(c.req.param('cpId')!, ids)
      return c.json(success(result))
    },
  )

  router.get('/:id', async (c) =>
    c.json(success(await eventService.getEventById(c.req.param('cpId')!, c.req.param('id')!))))

  router.patch('/:id', cpPermissionMiddleware('event:edit:own'),
    zValidator('json', updateEventSchema), async (c) =>
      c.json(success(await eventService.updateEvent(
        c.req.param('cpId')!, c.req.param('id')!, c.req.valid('json'), c.get('user').userId,
      ))))

  router.delete('/:id', cpPermissionMiddleware('event:delete:own'), async (c) => {
    await eventService.deleteEvent(c.req.param('cpId')!, c.req.param('id')!)
    return c.json(success(null))
  })

  router.post('/:id/milestone', cpPermissionMiddleware('milestone:create'), async (c) => {
    await eventService.toggleMilestone(c.req.param('cpId')!, c.req.param('id')!, true)
    return c.json(success(null))
  })

  router.delete('/:id/milestone', cpPermissionMiddleware('event:edit:own'), async (c) => {
    await eventService.toggleMilestone(c.req.param('cpId')!, c.req.param('id')!, false)
    return c.json(success(null))
  })

  // ── 版本历史 ─────────────────────────────────────────────
  router.get('/:id/versions', cpPermissionMiddleware('history:view:others'), async (c) =>
    c.json(success(await eventService.listEventVersions(c.req.param('cpId')!, c.req.param('id')!))))

  router.post('/:id/versions/:versionId/restore', cpPermissionMiddleware('history:restore'), async (c) => {
    const restored = await eventService.restoreEventVersion(
      c.req.param('cpId')!,
      c.req.param('id')!,
      c.req.param('versionId')!,
      c.get('user').userId,
    )
    return c.json(success(restored))
  })

  return router
}
