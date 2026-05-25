import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { globalSearch } from './search.service.js'
import { success } from '../../shared/response.js'

export function buildSearchRouter() {
  const router = new Hono()

  router.get(
    '/',
    zValidator('query', z.object({
      q:     z.string().min(1).max(100).trim(),
      cpId:  z.string().uuid().optional(),
    })),
    async (c) => {
      const { q, cpId } = c.req.valid('query')
      const userId = c.get('user').userId
      const result = await globalSearch(q, userId, cpId)
      return c.json(success(result))
    },
  )

  return router
}
