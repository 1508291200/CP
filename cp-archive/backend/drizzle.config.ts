import { defineConfig } from 'drizzle-kit'
import { loadConfig } from './src/config/index.js'

const config = loadConfig()

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.DATABASE_URL,
  },
})
