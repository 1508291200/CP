/**
 * 统一响应格式工具
 * 所有 API 响应必须通过此处的函数构造，保证格式一致性
 */

export interface ApiSuccess<T> {
  success: true
  data: T
  meta?: PaginationMeta
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export function success<T>(data: T, meta?: PaginationMeta): ApiSuccess<T> {
  const response: ApiSuccess<T> = { success: true, data }
  if (meta) response.meta = meta
  return response
}

export function failure(code: string, message: string, details?: unknown): ApiError {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  }
}

export function paginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return { total, page, limit, hasMore: page * limit < total }
}
