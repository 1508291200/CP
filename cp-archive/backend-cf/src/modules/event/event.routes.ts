import { Hono } from 'hono'
import { z } from 'zod'
import { createEventSchema, updateEventSchema, eventQuerySchema } from './event.schema.js'
import * as eventService from './event.service.js'
import * as relationsService from './event.relations.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { cpPermissionMiddleware } from '../../middlewares/cp-permission.middleware.js'
import { ValidationError } from '../../shared/errors.js'
import type { Env } from '../../types/env.js'

const event = new Hono<{ Bindings: Env }>()
event.use('*', authMiddleware)

// GET /cps/:cpId/events
event.get('/', async (c) => {
  const raw = Object.fromEntries(new URL(c.req.url).searchParams)
  const parsed = eventQuerySchema.safeParse(raw)
  if (!parsed.success) throw new ValidationError('查询参数错误', parsed.error.flatten())
  const result = await eventService.listEvents(c.req.param('cpId')!, parsed.data, c.env)
  return c.json(success(result.items, result.meta))
})

// POST /cps/:cpId/events
event.post('/', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  const ev = await eventService.createEvent(c.req.param('cpId')!, parsed.data, c.env, c.get('user').userId)
  return c.json(success(ev), 201)
})

// PATCH /cps/:cpId/events/batch
event.patch('/batch', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    ids:          z.array(z.string()).min(1),
    importance:   z.enum(['critical', 'high', 'medium', 'normal', 'low']).optional(),
    addTagIds:    z.array(z.string()).optional(),
    removeTagIds: z.array(z.string()).optional(),
  }).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await eventService.batchUpdateEvents(c.req.param('cpId')!, parsed.data, c.env)))
})

// DELETE /cps/:cpId/events/batch
event.delete('/batch', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({ ids: z.array(z.string()).min(1) }).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await eventService.batchDeleteEvents(c.req.param('cpId')!, parsed.data.ids, c.env)))
})

// GET /cps/:cpId/events/:id
event.get('/:id', async (c) => {
  return c.json(success(await eventService.getEventById(c.req.param('cpId')!, c.req.param('id')!, c.env)))
})

// PATCH /cps/:cpId/events/:id
event.patch('/:id', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = updateEventSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await eventService.updateEvent(c.req.param('cpId')!, c.req.param('id')!, parsed.data, c.env, c.get('user').userId)))
})

// DELETE /cps/:cpId/events/:id
event.delete('/:id', cpPermissionMiddleware('cp:update'), async (c) => {
  await eventService.deleteEvent(c.req.param('cpId')!, c.req.param('id')!, c.env)
  return c.json(success(null))
})

// POST/DELETE /:id/milestone
event.post('/:id/milestone', cpPermissionMiddleware('cp:update'), async (c) => {
  await eventService.toggleMilestone(c.req.param('cpId')!, c.req.param('id')!, true, c.env)
  return c.json(success(null))
})

event.delete('/:id/milestone', cpPermissionMiddleware('cp:update'), async (c) => {
  await eventService.toggleMilestone(c.req.param('cpId')!, c.req.param('id')!, false, c.env)
  return c.json(success(null))
})

// GET /:id/versions
event.get('/:id/versions', cpPermissionMiddleware('cp_member:manage'), async (c) => {
  return c.json(success(await eventService.listEventVersions(c.req.param('cpId')!, c.req.param('id')!, c.env)))
})

// POST /:id/versions/:versionId/restore
event.post('/:id/versions/:versionId/restore', cpPermissionMiddleware('cp:update'), async (c) => {
  const restored = await eventService.restoreEventVersion(
    c.req.param('cpId')!,
    c.req.param('id')!,
    c.req.param('versionId')!,
    c.env,
    c.get('user').userId,
  )
  return c.json(success(restored))
})

// GET /:id/relations
event.get('/:id/relations', async (c) => {
  return c.json(success(await relationsService.listRelations(c.req.param('cpId')!, c.req.param('id')!, c.env)))
})

// POST /:id/relations
event.post('/:id/relations', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = z.object({
    targetId:     z.string(),
    relationType: z.enum(['related', 'caused_by', 'led_to', 'parallel']).default('related'),
  }).safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  const relation = await relationsService.addRelation(
    c.req.param('cpId')!, c.req.param('id')!, parsed.data.targetId, parsed.data.relationType, c.env,
  )
  return c.json(success(relation), 201)
})

// DELETE /:id/relations/:relationId
event.delete('/:id/relations/:relationId', cpPermissionMiddleware('cp:update'), async (c) => {
  await relationsService.removeRelation(c.req.param('cpId')!, c.req.param('relationId')!, c.env)
  return c.json(success(null))
})

export { event as eventRoutes }
