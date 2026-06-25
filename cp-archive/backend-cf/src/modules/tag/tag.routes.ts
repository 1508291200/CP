import { Hono } from 'hono'
import { createTagSchema, updateTagSchema } from './tag.schema.js'
import * as tagService from './tag.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { requireRole } from '../../middlewares/permission.middleware.js'
import { ValidationError } from '../../shared/errors.js'
import type { Env } from '../../types/env.js'

const tag = new Hono<{ Bindings: Env }>()
tag.use('*', authMiddleware)

tag.get('/', async (c) => c.json(success(await tagService.listTags(c.env))))

tag.post('/', requireRole('editor'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = createTagSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await tagService.createTag(parsed.data, c.env, c.get('user').userId)), 201)
})

tag.patch('/:id', requireRole('editor'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = updateTagSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await tagService.updateTag(c.req.param('id'), parsed.data, c.env)))
})

tag.delete('/:id', requireRole('admin'), async (c) => {
  await tagService.deleteTag(c.req.param('id'), c.env)
  return c.json(success(null))
})

export { tag as tagRoutes }
