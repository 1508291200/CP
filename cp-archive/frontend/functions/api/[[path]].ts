/**
 * Cloudflare Pages Function — 将 /api/* 反向代理到 Workers 后端
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

  const targetUrl = `${WORKER_URL}/api/${pathSegments.join('/')}${url.search}`

  // 手动构建 Headers，显式转发所有需要的 header
  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === 'host') continue
    headers.set(key, value)
  }

  const proxyRequest = new Request(targetUrl, {
    method:  request.method,
    headers,
    body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  })

  const response = await fetch(proxyRequest)

  const responseHeaders = new Headers()
  for (const [key, value] of response.headers.entries()) {
    const lk = key.toLowerCase()
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
