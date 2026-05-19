import { defineConfig } from 'drizzle-kit'
import 'dotenv/config'

const DATABASE_URL = process.env['DATABASE_URL']
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for drizzle-kit. Run: cp .env.example .env')
}

export default defineConfig({
  schema: './src/db/schema/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
})
