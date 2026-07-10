/**
 * Cloudflare Workers 环境绑定类型
 */
export interface Env {
  // D1 数据库
  DB: D1Database
  // KV 命名空间（Session + 限速）
  KV: KVNamespace

  // 环境变量
  NODE_ENV: string

  // 腾讯云 COS 配置（非敏感，放 vars）
  COS_BUCKET: string      // 存储桶名称，如 cp-archive-media-1234567890
  COS_REGION: string      // 地域，如 ap-guangzhou
  COS_URL_EXPIRES: string // 预签名 URL 有效期（秒），字符串形式

  // Secrets（通过 wrangler secret put 设置）
  JWT_SECRET: string
  JWT_REFRESH_SECRET: string
  COS_SECRET_ID: string   // 腾讯云 SecretId
  COS_SECRET_KEY: string  // 腾讯云 SecretKey

  // 邮件服务（通过 wrangler secret put 设置）
  RESEND_API_KEY: string  // Resend API Key，用于发送密码重置邮件
  EMAIL_FROM:     string  // 发件人地址，如 "CP档案站 <noreply@yourdomain.com>"
}
