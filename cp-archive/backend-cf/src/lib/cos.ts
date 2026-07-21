/**
 * 腾讯云 COS 上传工具（使用腾讯云原生签名算法）
 *
 * Cloudflare Workers 无法使用 Node.js SDK，使用 Web Crypto API
 * 实现腾讯云 COS 原生签名（非 AWS SigV4），稳定性更好。
 *
 * 文档：https://cloud.tencent.com/document/product/436/7778
 */

/** HMAC-SHA1 签名（腾讯云 COS 原生签名使用 SHA1） */
async function hmacSha1(key: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const rawKey = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

/** Buffer 转十六进制字符串 */
function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** SHA-1 哈希（返回十六进制字符串） */
async function sha1Hex(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data)
  const hash = await crypto.subtle.digest('SHA-1', buf)
  return toHex(hash)
}

/**
 * 生成腾讯云 COS 原生签名（q-sign-algorithm=sha1）
 *
 * 签名格式参考：
 * https://cloud.tencent.com/document/product/436/7778
 */
async function cosSign(params: {
  method:      string   // 小写，如 'put'
  path:        string   // URL 路径，如 /images/xxx.jpg
  headers:     Record<string, string>
  secretId:    string
  secretKey:   string
  startTime?:  number   // Unix 时间戳（秒），默认当前时间
  expireTime?: number   // Unix 时间戳（秒），默认当前+3600
}): Promise<string> {
  const now        = Math.floor(Date.now() / 1000)
  const startTime  = params.startTime  ?? now
  const expireTime = params.expireTime ?? now + 3600
  const keyTime    = `${startTime};${expireTime}`

  // Step 1: 签名密钥
  const signKey = toHex(await hmacSha1(params.secretKey, keyTime))

  // Step 2: 规范化头部（按 key 字典序）
  const headerEntries = Object.entries(params.headers)
    .map(([k, v]) => [k.toLowerCase(), encodeURIComponent(v.trim())] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b))

  const headerList   = headerEntries.map(([k]) => k).join(';')
  const headerString = headerEntries.map(([k, v]) => `${k}=${v}`).join('&')

  // Step 3: 规范化请求串
  const method         = params.method.toLowerCase()
  const encodedPath    = params.path  // path 不需要再次编码，已是规范化路径
  const urlParamString = ''           // 暂不处理 query params
  const httpString     = `${method}\n${encodedPath}\n${urlParamString}\n${headerString}\n`
  const sha1OfHttpStr  = await sha1Hex(httpString)

  // Step 4: 待签字符串
  const stringToSign = `sha1\n${keyTime}\n${sha1OfHttpStr}\n`

  // Step 5: 签名
  const signature = toHex(await hmacSha1(signKey, stringToSign))

  // Step 6: 拼接 Authorization
  return [
    'q-sign-algorithm=sha1',
    `q-ak=${params.secretId}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    `q-header-list=${headerList}`,
    'q-url-param-list=',
    `q-signature=${signature}`,
  ].join('&')
}

/** 构建 COS 对象 key（路径） */
export function buildCosKey(mimeType: string, ext: string): string {
  const now    = new Date()
  const year   = now.getFullYear()
  const month  = String(now.getMonth() + 1).padStart(2, '0')
  const id     = crypto.randomUUID().replace(/-/g, '')
  const folder = mimeType.startsWith('video') ? 'videos' : 'images'
  return `${folder}/${year}/${month}/${id}.${ext}`
}

/**
 * 上传文件到腾讯云 COS（原生签名）
 */
export async function uploadToCos(params: {
  bucket:      string
  region:      string
  key:         string
  body:        ArrayBuffer
  contentType: string
  secretId:    string
  secretKey:   string
}): Promise<void> {
  const { bucket, region, key, body, contentType, secretId, secretKey } = params

  const host     = `${bucket}.cos.${region}.myqcloud.com`
  const path     = `/${key}`
  const endpoint = `https://${host}${path}`

  const headers: Record<string, string> = {
    'content-type': contentType,
    'host':         host,
  }

  const authorization = await cosSign({
    method:    'put',
    path,
    headers,
    secretId,
    secretKey,
  })

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Authorization': authorization,
      'Content-Type':  contentType,
      'Host':          host,
    },
    body,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`COS 上传失败 ${response.status}: ${text}`)
  }
}

/**
 * 从腾讯云 COS 删除文件
 */
export async function deleteFromCos(params: {
  bucket:    string
  region:    string
  key:       string
  secretId:  string
  secretKey: string
}): Promise<void> {
  const { bucket, region, key, secretId, secretKey } = params

  const host     = `${bucket}.cos.${region}.myqcloud.com`
  const path     = `/${key}`
  const endpoint = `https://${host}${path}`

  const headers: Record<string, string> = {
    'host': host,
  }

  const authorization = await cosSign({
    method:    'delete',
    path,
    headers,
    secretId,
    secretKey,
  })

  await fetch(endpoint, {
    method:  'DELETE',
    headers: {
      'Authorization': authorization,
      'Host':          host,
    },
  })
}

/**
 * 生成 COS 预签名 GET URL（私有读存储桶访问）
 * 使用腾讯云原生签名，有效期内任何人持 URL 均可访问。
 */
export async function generatePresignedUrl(params: {
  bucket:    string
  region:    string
  key:       string
  secretId:  string
  secretKey: string
  expiresIn?: number
}): Promise<string> {
  const { bucket, region, key, secretId, secretKey } = params
  const expiresIn = params.expiresIn ?? 3600

  const host  = `${bucket}.cos.${region}.myqcloud.com`
  const path  = `/${key}`

  const now        = Math.floor(Date.now() / 1000)
  const startTime  = now
  const expireTime = now + expiresIn
  const keyTime    = `${startTime};${expireTime}`

  const signKey = toHex(await hmacSha1(secretKey, keyTime))

  // 预签名：头部只签 host
  const headerList   = 'host'
  const headerString = `host=${encodeURIComponent(host)}`

  const httpString    = `get\n${path}\n\n${headerString}\n`
  const sha1OfHttpStr = await sha1Hex(httpString)
  const stringToSign  = `sha1\n${keyTime}\n${sha1OfHttpStr}\n`
  const signature     = toHex(await hmacSha1(signKey, stringToSign))

  const authQuery = [
    'q-sign-algorithm=sha1',
    `q-ak=${secretId}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    `q-header-list=${headerList}`,
    'q-url-param-list=',
    `q-signature=${signature}`,
  ].join('&')

  return `https://${host}${path}?${authQuery}`
}
