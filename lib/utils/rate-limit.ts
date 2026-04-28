// Simple in-memory rate limiter for API routes
// For production, use Redis-based rate limiting (e.g., @upstash/ratelimit)

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent memory leaks
const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 60_000)
if (typeof cleanupInterval.unref === 'function') cleanupInterval.unref()

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number
  /** Window size in seconds */
  windowSec: number
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { limit: 100, windowSec: 60 },
  ai: { limit: 20, windowSec: 60 },
  auth: { limit: 10, windowSec: 60 },
  webhook: { limit: 50, windowSec: 60 },
  // Heavy reads — full workspace dump or CSV stream. Returning the
  // whole tenant on every call is expensive on the DB and tempting
  // for a leaked key to abuse for exfiltration. 10/min is enough for
  // a CI runner doing nightly snapshots; not enough for a scrape.
  export: { limit: 10, windowSec: 60 },
  // Mutations — tighter than read so a leaked write key can't
  // hammer the DB with thousands of decisions. 30/min is generous
  // for human use; abusive automation hits the wall fast.
  mutation: { limit: 30, windowSec: 60 },
}

// ─────────────────────────────────────────────────────────────
// Per-plan public-API rate limits.
//
// Two-tier model (per feature #40 architecture):
//   1. **per-key** — protects a single key from monopolising the
//      workspace's quota. Tighter than the workspace ceiling.
//   2. **workspace ceiling** — protects the cluster from a customer
//      minting many keys to bypass per-key throttling. Looser than
//      the per-key limit times some plausible key count.
//
// Both buckets share the same 60-second window so callers see one
// clean reset boundary. A request is allowed only when BOTH buckets
// have headroom.
//
// Plan slug mapping (matches `PLAN_LIMITS` in `constants.ts`):
//   free       → no public-API access (gated at `hasFeature`)
//   starter    → "Team" tier (also no API access today)
//   pro        → "Business" tier ← first tier with API access
//   business   → "Enterprise" tier
//   enterprise → custom contracts; same as business in code
// ─────────────────────────────────────────────────────────────

export type ApiPlan = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

export interface ApiPlanRateLimit {
  /** Per-key bucket: a single API key can't exceed this. */
  perKey: RateLimitConfig
  /** Workspace ceiling: sum of all keys in a workspace can't exceed this. */
  workspace: RateLimitConfig
}

export const API_PLAN_RATE_LIMITS: Record<ApiPlan, ApiPlanRateLimit> = {
  free: {
    perKey: { limit: 60, windowSec: 60 },
    workspace: { limit: 120, windowSec: 60 },
  },
  starter: {
    perKey: { limit: 60, windowSec: 60 },
    workspace: { limit: 120, windowSec: 60 },
  },
  pro: {
    perKey: { limit: 600, windowSec: 60 },
    workspace: { limit: 1800, windowSec: 60 },
  },
  business: {
    perKey: { limit: 6000, windowSec: 60 },
    workspace: { limit: 30_000, windowSec: 60 },
  },
  enterprise: {
    perKey: { limit: 6000, windowSec: 60 },
    workspace: { limit: 30_000, windowSec: 60 },
  },
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): { success: boolean; limit: number; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = identifier

  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    const resetAt = now + config.windowSec * 1000
    store.set(key, { count: 1, resetAt })
    return { success: true, limit: config.limit, remaining: config.limit - 1, resetAt }
  }

  if (existing.count >= config.limit) {
    return { success: false, limit: config.limit, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  }
}

/**
 * Two-tier rate-limit decision for the public REST API.
 *
 * Behaviour:
 *  - Both buckets are checked; the request is allowed only when both
 *    have headroom.
 *  - When rejected, the **stricter** (sooner-to-reset, lower-remaining)
 *    bucket wins the response headers. This is the bucket the caller
 *    needs to back off on.
 *  - A rejection in either bucket does NOT increment the other —
 *    callers shouldn't be punished twice for the same wall-clock
 *    failure.
 *
 * The returned `headers` object is shaped to feed directly into
 * `buildResponseHeaders({ rateLimit: ... })` from `api-headers.ts`.
 */
export interface ApiRateLimitInput {
  keyId: string
  workspaceId: string
  plan: ApiPlan
}

export interface ApiRateLimitResult {
  /** True when both buckets have headroom. */
  allowed: boolean
  /** Headers describing the **binding** (stricter) bucket. */
  headers: { limit: number; remaining: number; resetAtSec: number }
  /** Seconds until the binding bucket resets. Set on 429 responses. */
  retryAfterSec: number
  /** Which bucket triggered the rejection (if any). For tests/diagnostics. */
  bindingBucket: 'per-key' | 'workspace' | 'none'
}

export function checkApiRateLimit(input: ApiRateLimitInput): ApiRateLimitResult {
  const { keyId, workspaceId, plan } = input
  const cfg = API_PLAN_RATE_LIMITS[plan]

  const perKey = rateLimit(`apikey:${keyId}`, cfg.perKey)
  const workspace = rateLimit(`apiws:${workspaceId}`, cfg.workspace)

  const allowed = perKey.success && workspace.success

  // Pick the binding bucket: the one that ran out first (or, if both
  // succeeded, the one closer to running out — that's what the
  // headers should reflect so the client backs off on the right cycle).
  const perKeyTighter =
    !perKey.success ||
    (workspace.success && perKey.remaining <= workspace.remaining)

  const binding = perKeyTighter ? perKey : workspace
  const bindingBucket: ApiRateLimitResult['bindingBucket'] = allowed
    ? 'none'
    : !perKey.success
      ? 'per-key'
      : 'workspace'

  const resetAtSec = Math.ceil(binding.resetAt / 1000)
  const limit = perKeyTighter ? cfg.perKey.limit : cfg.workspace.limit

  return {
    allowed,
    headers: {
      limit,
      remaining: Math.max(0, binding.remaining),
      resetAtSec,
    },
    retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((binding.resetAt - Date.now()) / 1000)),
    bindingBucket,
  }
}

/**
 * Test-only: clear the in-memory rate-limit store. Exported so
 * `tests/unit/rate-limit.test.ts` can isolate cases without
 * cross-test contamination. Production code MUST NOT call this.
 */
export function __resetRateLimitStoreForTests(): void {
  store.clear()
}

/**
 * Build a 429 response. Backwards compatible: callers may pass just the
 * `resetAt` epoch-ms (legacy signature) or an options object that
 * additionally carries the bucket's `limit` so the response can emit
 * the full `X-RateLimit-Limit` + `X-RateLimit-Remaining` triplet.
 *
 * Signed by feature #40 — the public REST API contract requires these
 * headers on every 429.
 */
export function rateLimitResponse(
  resetAtOrOpts:
    | number
    | { resetAt: number; limit?: number; remaining?: number }
) {
  const opts =
    typeof resetAtOrOpts === 'number' ? { resetAt: resetAtOrOpts } : resetAtOrOpts
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Retry-After': String(Math.max(1, Math.ceil((opts.resetAt - Date.now()) / 1000))),
    'X-RateLimit-Reset': String(Math.ceil(opts.resetAt / 1000)),
  }
  if (typeof opts.limit === 'number') headers['X-RateLimit-Limit'] = String(opts.limit)
  if (typeof opts.remaining === 'number') {
    headers['X-RateLimit-Remaining'] = String(Math.max(0, opts.remaining))
  } else if (typeof opts.limit === 'number') {
    // If we know the limit but not remaining, the caller is in the 429
    // path — there are zero requests left.
    headers['X-RateLimit-Remaining'] = '0'
  }

  return new Response(
    JSON.stringify({
      error: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    }),
    { status: 429, headers }
  )
}
