/**
 * 腾讯云 COS 上传工具（基于 S3 兼容 API + AWS Signature V4）
 *
 * Cloudflare Workers 不能运行 Node.js SDK，使用 Web Crypto API 手动实现
 * AWS Signature V4 签名，直接向 COS 发 HTTP 请求。
 *
 * 腾讯云 COS 完全兼容 S3 API，endpoint 格式：
 *   https://{bucket}.cos.{region}.myqcloud.com
 */

/** HMAC-SHA256 签名 */
async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

/** SHA-256 哈希（返回十六进制字符串） */
async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Buffer 转十六进制字符串 */
function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 通用 S3 请求签名（支持有/无 content-type）
 */
async function signRequest(params: {
  method: string
  host: string
  path: string
  region: string
  service: string
  secretId: string
  secretKey: string
  contentType?: string
  bodyHash: string
  date: string
  datetime: string
}): Promise<{ authorization: string; signedHeaders: string }> {
  const { method, host, path, region, service, secretId, secretKey, bodyHash, date, datetime } = params
  const contentType = params.contentType ?? ''

  // 有 contentType 时才加入签名头
  const hasContentType = contentType.length > 0
  const canonicalHeaders = hasContentType
    ? `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${datetime}\n`
    : `host:${host}\nx-amz-content-sha256:${bodyHash}\nx-amz-date:${datetime}\n`
  const signedHeaders = hasContentType
    ? 'content-type;host;x-amz-content-sha256;x-amz-date'
    : 'host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, bodyHash].join('\n')
  const credentialScope  = `${date}/${region}/${service}/aws4_request`
  const stringToSign     = ['AWS4-HMAC-SHA256', datetime, credentialScope, await sha256Hex(canonicalRequest)].join('\n')

  const kDate    = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), date)
  const kRegion  = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, service)
  const kSigning = await hmacSha256(kService, 'aws4_request')
  const signature = toHex(await hmacSha256(kSigning, stringToSign))

  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    signedHeaders,
  }
}

/**
 * 生成 COS 预签名 GET URL（用于私有读存储桶）
 *
 * 通过 Query String 参数传递签名，有效期内任何人持 URL 均可访问该对象。
 * 腾讯云 COS 支持 AWS Signature V4 预签名格式。
 *
 * @param params.bucket    存储桶名称
 * @param params.region    地域
 * @param params.key       对象 key
 * @param params.secretId  腾讯云 SecretId
 * @param params.secretKey 腾讯云 SecretKey
 * @param params.expiresIn 有效期（秒），默认 3600（1小时）
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

  const host     = `${bucket}.cos.${region}.myqcloud.com`
  const path     = `/${key}`

  const now      = new Date()
  const datetime = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z'
  const date     = datetime.slice(0, 8)

  const credentialScope = `${date}/${region}/s3/aws4_request`

  // 预签名使用 Query String 方式，body hash 固定为 UNSIGNED-PAYLOAD
  const bodyHash = 'UNSIGNED-PAYLOAD'

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm':     'AWS4-HMAC-SHA256',
    'X-Amz-Credential':    `${secretId}/${credentialScope}`,
    'X-Amz-Date':          datetime,
    'X-Amz-Expires':       String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  })
  // 按 key 字典序排列（URLSearchParams 已按插入顺序，需手动排序）
  const sortedQuery = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const canonicalHeaders  = `host:${host}\n`
  const signedHeaders     = 'host'
  const canonicalRequest  = ['GET', path, sortedQuery, canonicalHeaders, signedHeaders, bodyHash].join('\n')
  const stringToSign      = ['AWS4-HMAC-SHA256', datetime, credentialScope, await sha256Hex(canonicalRequest)].join('\n')

  const kDate    = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), date)
  const kRegion  = await hmacSha256(kDate, region)
  const kService = await hmacSha256(kRegion, 's3')
  const kSigning = await hmacSha256(kService, 'aws4_request')
  const signature = toHex(await hmacSha256(kSigning, stringToSign))

  return `https://${host}${path}?${sortedQuery}&X-Amz-Signature=${signature}`
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

/** 构建 COS 内部 endpoint URL（仅内部使用，不对外暴露） */
function cosEndpoint(bucket: string, region: string, key: string): string {
  return `https://${bucket}.cos.${region}.myqcloud.com/${key}`
}

/**
 * 上传文件到腾讯云 COS
 *
 * @param params.bucket      存储桶名称，如 cp-archive-media-1234567890
 * @param params.region      地域，如 ap-guangzhou
 * @param params.key         对象 key（路径），如 images/2024/01/abc123.jpg
 * @param params.body        文件内容（ArrayBuffer）
 * @param params.contentType MIME 类型
 * @param params.secretId    腾讯云 SecretId
 * @param params.secretKey   腾讯云 SecretKey
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

  // COS S3 兼容 endpoint
  const host     = `${bucket}.cos.${region}.myqcloud.com`
  const path     = `/${key}`
  const endpoint = cosEndpoint(bucket, region, key)

  // 时间戳
  const now      = new Date()
  const datetime = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z'
  const date     = datetime.slice(0, 8)

  // 计算 body hash
  const bodyHash = await sha256Hex(body)

  const { authorization } = await signRequest({
    method:      'PUT',
    host,
    path,
    region,
    service:     's3',
    secretId,
    secretKey,
    contentType,
    bodyHash,
    date,
    datetime,
  })

  const response = await fetch(endpoint, {
    method:  'PUT',
    headers: {
      'Authorization':         authorization,
      'Content-Type':          contentType,
      'x-amz-content-sha256': bodyHash,
      'x-amz-date':           datetime,
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
  const endpoint = cosEndpoint(bucket, region, key)

  const now      = new Date()
  const datetime = now.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z'
  const date     = datetime.slice(0, 8)
  const bodyHash = await sha256Hex('')

  const { authorization } = await signRequest({
    method:      'DELETE',
    host,
    path,
    region,
    service:     's3',
    secretId,
    secretKey,
    bodyHash,
    date,
    datetime,
  })

  await fetch(endpoint, {
    method:  'DELETE',
    headers: {
      'Authorization':         authorization,
      'x-amz-content-sha256': bodyHash,
      'x-amz-date':           datetime,
    },
  })
}
