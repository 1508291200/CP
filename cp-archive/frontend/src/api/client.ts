/**
 * API 客户端
 * - 统一的 Axios 实例，所有 API 请求必须通过此处
 * - 自动注入 Authorization header
 * - 401 时自动刷新 Token 并重放请求
 * - 统一错误格式转换
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

// API 响应的统一格式（与后端 shared/response.ts 对应）
export interface PaginationMeta {
  total:   number
  page:    number
  limit:   number
  hasMore: boolean
}

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

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// 客户端错误类，统一抛出
export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

// ── Axios 实例 ──────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  // 通过 Cloudflare Pages _redirects 将 /api/* 代理到 Workers
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 携带 Cookie（Refresh Token）
})

// Token 存储（内存，不存 localStorage 防 XSS）
let accessToken: string | null = null
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

// ── 请求拦截器：注入 Authorization ─────────────────────
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ── 响应拦截器：处理 401 自动刷新 ──────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // 401 且不是刷新接口本身，尝试刷新 Token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        // 已在刷新中，将请求排队
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            resolve(apiClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await apiClient.post<ApiSuccess<{ accessToken: string }>>('/auth/refresh')
        const newToken = res.data.data.accessToken
        setAccessToken(newToken)

        // 通知队列中的请求
        refreshQueue.forEach((cb) => cb(newToken))
        refreshQueue = []

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return apiClient(originalRequest)
      } catch {
        // Refresh 失败，清空 token，跳转登录页
        setAccessToken(null)
        refreshQueue = []
        // 通过自定义事件通知 auth store
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// ── 通用请求包装器：统一处理错误格式 ───────────────────
async function request<T>(config: AxiosRequestConfig): Promise<ApiSuccess<T>> {
  try {
    const response = await apiClient.request<ApiResponse<T>>(config)
    const data = response.data

    if (!data.success) {
      throw new ApiClientError(data.error.code, data.error.message, data.error.details)
    }

    return data
  } catch (err) {
    if (err instanceof ApiClientError) throw err
    if (axios.isAxiosError(err) && err.response?.data) {
      const errData = err.response.data as ApiError
      throw new ApiClientError(
        errData.error?.code ?? 'NETWORK_ERROR',
        errData.error?.message ?? err.message,
        errData.error?.details,
      )
    }
    throw new ApiClientError('NETWORK_ERROR', err instanceof Error ? err.message : 'Network error')
  }
}

export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    request<T>({ method: 'GET', url, params }),
  post: <T>(url: string, data?: unknown) =>
    request<T>({ method: 'POST', url, data }),
  patch: <T>(url: string, data?: unknown) =>
    request<T>({ method: 'PATCH', url, data }),
  put: <T>(url: string, data?: unknown) =>
    request<T>({ method: 'PUT', url, data }),
  delete: <T = void>(url: string, data?: unknown) =>
    request<T>({ method: 'DELETE', url, data }),
}

export default apiClient
