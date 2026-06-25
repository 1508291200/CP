import type { Config } from 'drizzle-kit'

export default {
  schema:    './src/db/schema/index.ts',
  out:       './migrations',
  dialect:   'sqlite',
  driver:    'd1-http',
  dbCredentials: {
    // 本地开发时用 wrangler d1 操作，这里配置仅供 drizzle-kit studio 使用
    accountId:   process.env['CLOUDFLARE_ACCOUNT_ID']  ?? '',
    databaseId:  process.env['CLOUDFLARE_DATABASE_ID'] ?? '',
    token:       process.env['CLOUDFLARE_D1_TOKEN']     ?? '',
  },
} satisfies Config
