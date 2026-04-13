import { createClient } from '@supabase/supabase-js'

const hasValidDatabaseUrl =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY

export { hasValidDatabaseUrl }

function createDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || !hasValidDatabaseUrl) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Lazy singleton — only connects when first accessed
let _db: ReturnType<typeof createDb> | null = null

export function getDb() {
  if (!_db) _db = createDb()
  return _db
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) _db = createDb()
    return (_db as unknown as Record<string | symbol, unknown>)[prop]
  },
})
