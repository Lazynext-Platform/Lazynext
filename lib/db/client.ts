import { createClient } from '@supabase/supabase-js'

// Guard against stock placeholder env values. If someone clones the repo and
// forgets to swap these, we want DB-touching code paths to bail out fast
// (returning safe fallbacks / notFound) instead of hanging 7+ seconds on a
// doomed network request to a fake Supabase URL.
const PLACEHOLDER_PATTERNS = [
  'placeholder',
  'your-project',
  'your-service-role',
  'your-anon-key',
  'example.supabase.co',
]
function looksLikePlaceholder(v: string | undefined): boolean {
  if (!v) return true
  const lower = v.toLowerCase()
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p))
}

const hasValidDatabaseUrl =
  !looksLikePlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  !looksLikePlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)

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
