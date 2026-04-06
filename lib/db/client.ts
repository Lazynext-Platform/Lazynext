import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const hasValidDatabaseUrl =
  !!process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('placeholder') &&
  process.env.DATABASE_URL.startsWith('postgres')

export { hasValidDatabaseUrl }

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url || !hasValidDatabaseUrl) {
    throw new Error('DATABASE_URL is not configured. Set a valid Neon PostgreSQL connection string in .env.local')
  }
  const sql = neon(url)
  return drizzle(sql, { schema })
}

// Lazy singleton — only connects when first accessed
let _db: ReturnType<typeof createDb> | null = null

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) _db = createDb()
    return (_db as unknown as Record<string | symbol, unknown>)[prop]
  },
})
