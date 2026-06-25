import { Hono } from 'hono'
import { createCharacterSchema, updateCharacterSchema } from './character.schema.js'
import * as characterService from './character.service.js'
import { success } from '../../shared/response.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { cpPermissionMiddleware } from '../../middlewares/cp-permission.middleware.js'
import { ValidationError } from '../../shared/errors.js'
import type { Env } from '../../types/env.js'

// 挂载在 /cps/:id/characters，但此路由自身用 :cpId
const character = new Hono<{ Bindings: Env }>()
character.use('*', authMiddleware)

character.get('/', async (c) => {
  return c.json(success(await characterService.listCharacters(c.req.param('cpId')!, c.env)))
})

character.post('/', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = createCharacterSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await characterService.createCharacter(c.req.param('cpId')!, parsed.data, c.env)), 201)
})

character.patch('/:charId', cpPermissionMiddleware('cp:update'), async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = updateCharacterSchema.safeParse(body)
  if (!parsed.success) throw new ValidationError('请求数据格式错误', parsed.error.flatten())
  return c.json(success(await characterService.updateCharacter(c.req.param('cpId')!, c.req.param('charId')!, parsed.data, c.env)))
})

character.delete('/:charId', cpPermissionMiddleware('cp:update'), async (c) => {
  await characterService.deleteCharacter(c.req.param('cpId')!, c.req.param('charId')!, c.env)
  return c.json(success(null))
})

export { character as characterRoutes }
