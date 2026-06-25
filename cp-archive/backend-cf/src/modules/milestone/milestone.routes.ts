import { Hono } from 'hono'
import { createMilestoneSchema, updateMilestoneSchema } from './milestone.schema.js'
import * as milestoneService from './milestone.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { cpPermissionMiddleware } from '../../middlewares/cp-permission.middleware.js'
import { ValidationError } from '../../shared/errors.js'
import type { Env } from '../../types/env.js'

const milestone = new Hono<{ Bindings: Env }>()
milestone.use('*', authMiddleware)

milestone.get('/', async (c) => {
  return c.json(success(await milestoneService.listMilestones(c.req.param('cpId')!, c.env)))
})

milestone.post('/', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = createMilestoneSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await milestoneService.createMilestone(c.req.param('cpId')!, parsed.data, c.env)), 201)
})

milestone.patch('/:milestoneId', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = updateMilestoneSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await milestoneService.updateMilestone(c.req.param('cpId')!, c.req.param('milestoneId')!, parsed.data, c.env)))
})

milestone.delete('/:milestoneId', cpPermissionMiddleware('cp:update'), async (c) => {
  await milestoneService.deleteMilestone(c.req.param('cpId')!, c.req.param('milestoneId')!, c.env)
  return c.json(success(null))
})

export { milestone as milestoneRoutes }
