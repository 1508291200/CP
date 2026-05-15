import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createMilestoneSchema, updateMilestoneSchema } from './milestone.schema.js'
import * as milestoneService from './milestone.service.js'
import { success } from '../../shared/response.js'
import { permissionMiddleware } from '../../middlewares/permission.middleware.js'

export function buildMilestoneRouter() {
  const router = new Hono()

  router.get('/', async (c) =>
    c.json(success(await milestoneService.listMilestones(c.req.param('cpId')!))))

  router.post('/', permissionMiddleware('milestone:create'),
    zValidator('json', createMilestoneSchema), async (c) =>
      c.json(success(await milestoneService.createMilestone(c.req.param('cpId')!, c.req.valid('json'))), 201))

  router.patch('/:msId', permissionMiddleware('milestone:edit'),
    zValidator('json', updateMilestoneSchema), async (c) =>
      c.json(success(await milestoneService.updateMilestone(
        c.req.param('cpId')!, c.req.param('msId')!, c.req.valid('json'),
      ))))

  router.delete('/:msId', permissionMiddleware('milestone:delete'), async (c) => {
    await milestoneService.deleteMilestone(c.req.param('cpId')!, c.req.param('msId')!)
    return c.json(success(null))
  })

  return router
}
