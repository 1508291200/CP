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
  VERSION: string
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

  return {
    NODE_ENV: nodeEnv as AppConfig['NODE_ENV'],
    PORT: parseInt(optionalEnv('PORT', '3000'), 10),
    DATABASE_URL: requireEnv('DATABASE_URL'),
    REDIS_URL: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
    REDIS_HOST: optionalEnv('REDIS_HOST', 'localhost'),
    REDIS_PORT: parseInt(optionalEnv('REDIS_PORT', '6379'), 10),
    JWT_SECRET: nodeEnv === 'development'
      ? optionalEnv('JWT_SECRET', 'dev-secret-change-in-production')
      : requireEnv('JWT_SECRET'),
    JWT_REFRESH_SECRET: nodeEnv === 'development'
      ? optionalEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-in-production')
      : requireEnv('JWT_REFRESH_SECRET'),
    UPLOAD_DIR: optionalEnv('UPLOAD_DIR', './uploads'),
    PUBLIC_URL: optionalEnv('PUBLIC_URL', 'http://localhost:3000'),
    VERSION: optionalEnv('npm_package_version', '0.1.0'),
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
