/**
 * 腾讯云 COS 上传工具（使用腾讯云原生签名算法）
 */

async function hmacSha1(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const rawKey = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw', rawKey, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha1Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(data))
  return toHex(hash)
}

async function cosSign(params: {
  method: string; path: string; headers: Record<string, string>
  secretId: string; secretKey: string; startTime?: number; expireTime?: number
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const startTime = params.startTime ?? now
  const expireTime = params.expireTime ?? now + 3600
  const keyTime = `${startTime};${expireTime}`
  const signKey = toHex(await hmacSha1(params.secretKey, keyTime))
  const headerEntries = Object.entries(params.headers)
    .map(([k, v]) => [k.toLowerCase(), encodeURIComponent(v.trim())] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))
  const headerList = headerEntries.map(([k]) => k).join(';')
  const headerString = headerEntries.map(([k, v]) => `${k}=${v}`).join('&')
  const httpString = `${params.method.toLowerCase()}\n${params.path}\n\n${headerString}\n`
  const sha1OfHttpStr = await sha1Hex(httpString)
  const stringToSign = `sha1\n${keyTime}\n${sha1OfHttpStr}\n`
  const signature = toHex(await hmacSha1(signKey, stringToSign))
  return ['q-sign-algorithm=sha1', `q-ak=${params.secretId}`, `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`, `q-header-list=${headerList}`, 'q-url-param-list=',
    `q-signature=${signature}`].join('&')
}

export function buildCosKey(mimeType: string, ext: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const id = crypto.randomUUID().replace(/-/g, '')
  const folder = mimeType.startsWith('video') ? 'videos' : 'images'
  return `${folder}/${year}/${month}/${id}.${ext}`
}

export async function uploadToCos(params: {
  bucket: string; region: string; key: string
  body: ArrayBuffer; contentType: string; secretId: string; secretKey: string
}): Promise<void> {
  const { bucket, region, key, body, contentType, secretId, secretKey } = params
  const host = `${bucket}.cos.${region}.myqcloud.com`
  const path = `/${key}`
  const authorization = await cosSign({
    method: 'put', path,
    headers: { 'content-type': contentType, 'host': host },
    secretId, secretKey,
  })
  const response = await fetch(`https://${host}${path}`, {
    method: 'PUT',
    headers: { 'Authorization': authorization, 'Content-Type': contentType, 'Host': host },
    body,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`COS 上传失败 ${response.status}: ${text}`)
  }
}

export async function deleteFromCos(params: {
  bucket: string; region: string; key: string; secretId: string; secretKey: string
}): Promise<void> {
  const { bucket, region, key, secretId, secretKey } = params
  const host = `${bucket}.cos.${region}.myqcloud.com`
  const path = `/${key}`
  const authorization = await cosSign({
    method: 'delete', path,
    headers: { 'host': host },
    secretId, secretKey,
  })
  await fetch(`https://${host}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': authorization, 'Host': host },
  })
}

export async function generatePresignedUrl(params: {
  bucket: string; region: string; key: string
  secretId: string; secretKey: string; expiresIn?: number
}): Promise<string> {
  const { bucket, region, key, secretId, secretKey } = params
  const expiresIn = params.expiresIn ?? 3600
  const host = `${bucket}.cos.${region}.myqcloud.com`
  const path = `/${key}`
  const now = Math.floor(Date.now() / 1000)
  const keyTime = `${now};${now + expiresIn}`
  const signKey = toHex(await hmacSha1(secretKey, keyTime))
  const headerString = `host=${encodeURIComponent(host)}`
  const httpString = `get\n${path}\n\n${headerString}\n`
  const sha1OfHttpStr = await sha1Hex(httpString)
  const stringToSign = `sha1\n${keyTime}\n${sha1OfHttpStr}\n`
  const signature = toHex(await hmacSha1(signKey, stringToSign))
  const authQuery = ['q-sign-algorithm=sha1', `q-ak=${secretId}`, `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`, 'q-header-list=host', 'q-url-param-list=',
    `q-signature=${signature}`].join('&')
  return `https://${host}${path}?${authQuery}`
}
