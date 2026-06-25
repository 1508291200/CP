/**
 * 生产环境错误处理中间件（脱敏）
 */
import { createMiddleware } from 'hono/factory'
import { ZodError } from 'zod'
import { AppError } from '../shared/errors.js'
import { failure } from '../shared/response.js'

export const errorHandler = createMiddleware(async (c, next) => {
  try {
    await next()
  } catch (err) {
    if (err instanceof AppError) {
      return c.json(failure(err.code, err.message, err.details), err.statusCode as never)
    }

    if (err instanceof ZodError) {
      return c.json(
        failure('VALIDATION_ERROR', '请求数据格式错误', err.flatten()),
        400,
      )
    }

    // 生产环境不暴露内部错误
    console.error('[UnhandledError]', err)
    return c.json(failure('INTERNAL_ERROR', '服务器内部错误'), 500)
  }
})
