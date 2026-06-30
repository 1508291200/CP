/**
 * Cloudflare Pages Function — 将 /api/* 反向代理到 Workers 后端
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

  const proxyRequest = new Request(targetUrl, {
    method:  request.method,
    headers: request.headers,
    body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  })

  const response = await fetch(proxyRequest)

  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers:    response.headers,
  })
}
