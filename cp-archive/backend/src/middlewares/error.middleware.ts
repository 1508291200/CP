/**
 * 错误处理中间件
 * 捕获所有未处理的错误，转换为统一的 API 错误响应格式
 */

import type { Context, Next } from 'hono'
import { ZodError } from 'zod'
import { AppError } from '../shared/errors.js'
import { failure } from '../shared/response.js'

export async function errorMiddleware(c: Context, next: Next): Promise<Response | void> {
  try {
    await next()
  } catch (err) {
    // Zod 验证错误
    if (err instanceof ZodError) {
      return c.json(
        failure('VALIDATION_ERROR', 'Invalid request parameters', err.flatten()),
        400,
      )
    }

    // 业务逻辑错误
    if (err instanceof AppError) {
      return c.json(
        failure(err.code, err.message, err.details),
        err.statusCode as 400 | 401 | 403 | 404 | 409 | 500,
      )
    }

    // 未知错误 - 不暴露内部细节
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[UnhandledError]', err)
    return c.json(failure('INTERNAL_ERROR', 'Internal server error'), 500)
  }
}
