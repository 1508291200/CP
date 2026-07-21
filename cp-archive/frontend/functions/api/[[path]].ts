/**
 * Cloudflare Pages Function — 将 /api/* 反向代理到 Workers 后端
 *
 * 文件路径 functions/api/[[path]].ts 会匹配所有 /api/... 请求
 * 支持所有 HTTP 方法（GET/POST/PUT/PATCH/DELETE/OPTIONS）
 *
 * 注意：Cloudflare 会在跨域代理时自动剥除 Authorization header，
 * 需要手动构建 Headers 并显式转发 Authorization。
 */

const WORKER_URL = 'https://cp-archive.youzixi.workers.dev'

export async function onRequest(context: {
  request: Request
  params: { path?: string[] }
}): Promise<Response> {
  const { request, params } = context
  const pathSegments = params.path ?? []
  const url = new URL(request.url)

  // 构建目标 URL：保留 query string
  const targetUrl = `${WORKER_URL}/api/${pathSegments.join('/')}${url.search}`

  // 手动构建 Headers，显式转发所有需要的 header
  // （直接传 request.headers 会被 CF 剥除 Authorization）
  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    // 跳过 host（目标域名不同）
    if (key.toLowerCase() === 'host') continue
    headers.set(key, value)
  }

  const proxyRequest = new Request(targetUrl, {
    method:  request.method,
    headers,
    body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    // 不跟随重定向，直接透传
    redirect: 'manual',
  })

  const response = await fetch(proxyRequest)

  // 透传响应 headers，但过滤掉不应转发的
  const responseHeaders = new Headers()
  for (const [key, value] of response.headers.entries()) {
    const lk = key.toLowerCase()
    // 跳过这些 CF 内部/安全头，避免双重设置
    if (lk === 'content-encoding') continue
    if (lk === 'transfer-encoding') continue
    responseHeaders.set(key, value)
  }

  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers:    responseHeaders,
  })
}
