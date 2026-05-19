import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { createCharacterSchema, updateCharacterSchema } from './character.schema.js'
import * as characterService from './character.service.js'
import { success } from '../../shared/response.js'
import { cpPermissionMiddleware } from '../../middlewares/cp-permission.middleware.js'

export function buildCharacterRouter() {
  const router = new Hono()

  router.get('/', async (c) =>
    c.json(success(await characterService.listCharacters(c.req.param('cpId')!))))

  router.post('/', cpPermissionMiddleware('character:edit'),
    zValidator('json', createCharacterSchema), async (c) =>
      c.json(success(await characterService.createCharacter(c.req.param('cpId')!, c.req.valid('json'))), 201))

  router.patch('/:charId', cpPermissionMiddleware('character:edit'),
    zValidator('json', updateCharacterSchema), async (c) =>
      c.json(success(await characterService.updateCharacter(
        c.req.param('cpId')!, c.req.param('charId')!, c.req.valid('json'),
      ))))

  router.delete('/:charId', cpPermissionMiddleware('character:edit'), async (c) => {
    await characterService.deleteCharacter(c.req.param('cpId')!, c.req.param('charId')!)
    return c.json(success(null))
  })

  return router
}
