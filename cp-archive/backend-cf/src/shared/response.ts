/**
 * 统一响应格式（与原版保持一致，前端无感知）
 */
export interface PaginationMeta {
  total:   number
  page:    number
  limit:   number
  hasMore: boolean
}

export function success<T>(data: T, meta?: PaginationMeta) {
  return { success: true, data, ...(meta ? { meta } : {}) }
}

export function failure(code: string, message: string, details?: unknown) {
  return {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  }
}
