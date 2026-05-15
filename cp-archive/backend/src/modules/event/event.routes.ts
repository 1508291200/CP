import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createEventSchema, updateEventSchema, eventQuerySchema } from './event.schema.js'
import * as eventService from './event.service.js'
import { success } from '../../shared/response.js'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'

export function buildEventRouter() {
  const router = new Hono()

  router.get('/', zValidator('query', eventQuerySchema), async (c) => {
    const result = await eventService.listEvents(c.req.param('cpId')!, c.req.valid('query'))
    return c.json(success(result.items, result.meta))
  })

  router.post('/', permissionMiddleware('event:create'),
    zValidator('json', createEventSchema), async (c) =>
      c.json(
        success(await eventService.createEvent(c.req.param('cpId')!, c.req.valid('json'), c.get('user').userId)),
        201,
      ))

  router.get('/:id', async (c) =>
    c.json(success(await eventService.getEventById(c.req.param('cpId')!, c.req.param('id')!))))

  router.patch('/:id', permissionMiddleware('event:edit:own'),
    zValidator('json', updateEventSchema), async (c) =>
      c.json(success(await eventService.updateEvent(
        c.req.param('cpId')!, c.req.param('id')!, c.req.valid('json'), c.get('user').userId,
      ))))

  router.delete('/:id', permissionMiddleware('event:delete:own'), async (c) => {
    await eventService.deleteEvent(c.req.param('cpId')!, c.req.param('id')!)
    return c.json(success(null))
  })

  router.post('/:id/milestone', permissionMiddleware('milestone:create'), async (c) => {
    await eventService.toggleMilestone(c.req.param('cpId')!, c.req.param('id')!, true)
    return c.json(success(null))
  })

  router.delete('/:id/milestone', permissionMiddleware('event:edit:own'), async (c) => {
    await eventService.toggleMilestone(c.req.param('cpId')!, c.req.param('id')!, false)
    return c.json(success(null))
  })

  return router
}
