/**
 * 配置模块 - 统一读取环境变量，所有模块通过此处导入配置
 * 不允许在其他模块中直接使用 process.env
 */

interface AppConfig {
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: number
  DATABASE_URL: string
  REDIS_URL: string
  REDIS_HOST: string
  REDIS_PORT: number
  JWT_SECRET: string
  JWT_REFRESH_SECRET: string
  UPLOAD_DIR: string
  PUBLIC_URL: string
  ALLOWED_ORIGINS: string[]
  VERSION: string
  // ── 对象存储（Cloudflare R2 / 兼容 S3）────────────
  STORAGE_DRIVER: 'local' | 'r2'
  R2_ACCOUNT_ID: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_BUCKET: string
  R2_PUBLIC_URL: string   // 公开访问域名（R2 custom domain 或 pub-xxx.r2.dev）
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue
}

export function loadConfig(): AppConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development')
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error(`[Config] Invalid NODE_ENV: ${nodeEnv}`)
  }

  const redisUrl = optionalEnv('REDIS_URL', 'redis://localhost:6379')
  // 从 REDIS_URL 解析 host/port（兼容 Zeabur 注入的完整 URL）
  let redisHost = optionalEnv('REDIS_HOST', 'localhost')
  let redisPort = parseInt(optionalEnv('REDIS_PORT', '6379'), 10)
  try {
    const u = new URL(redisUrl)
    redisHost = u.hostname || redisHost
    redisPort = u.port ? parseInt(u.port, 10) : redisPort
  } catch { /* 忽略解析失败 */ }

  const storageDriver = optionalEnv('STORAGE_DRIVER', 'local') as 'local' | 'r2'

  return {
    NODE_ENV: nodeEnv as AppConfig['NODE_ENV'],
    PORT: parseInt(optionalEnv('PORT', '3000'), 10),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    REDIS_URL: redisUrl,
    REDIS_HOST: redisHost,
    REDIS_PORT: redisPort,
    JWT_SECRET: nodeEnv === 'development'
      ? optionalEnv('JWT_SECRET', 'dev-secret-change-in-production')
      : requireEnv('JWT_SECRET'),
    JWT_REFRESH_SECRET: nodeEnv === 'development'
      ? optionalEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production')
      : requireEnv('JWT_REFRESH_SECRET'),
    UPLOAD_DIR: optionalEnv('UPLOAD_DIR', './uploads'),
    PUBLIC_URL: optionalEnv('PUBLIC_URL', 'http://localhost:3000'),
    ALLOWED_ORIGINS: optionalEnv('ALLOWED_ORIGINS', '').split(',').map(s => s.trim()).filter(Boolean),
    VERSION: optionalEnv('npm_package_version', '0.1.0'),
    STORAGE_DRIVER: storageDriver,
    R2_ACCOUNT_ID: optionalEnv('R2_ACCOUNT_ID', ''),
    R2_ACCESS_KEY_ID: optionalEnv('R2_ACCESS_KEY_ID', ''),
    R2_SECRET_ACCESS_KEY: optionalEnv('R2_SECRET_ACCESS_KEY', ''),
    R2_BUCKET: optionalEnv('R2_BUCKET', ''),
    R2_PUBLIC_URL: optionalEnv('R2_PUBLIC_URL', ''),
  }
}

// 单例 - 应用启动时加载一次
let _config: AppConfig | null = null

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig()
  }
  return _config
}
