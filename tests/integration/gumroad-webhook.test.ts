import { describe, it, expect, vi, beforeEach } from 'vitest'

// -----------------------------------------------------------------------
// Mock plumbing — a tiny fake Supabase that records every update() call
// so we can assert on the resulting mutations.
// -----------------------------------------------------------------------

type Update = { table: string; patch: Record<string, unknown>; where: Record<string, unknown> }

const updates: Update[] = []
const inserts: { table: string; row: Record<string, unknown> }[] = []
// Flip this to simulate a duplicate-key violation on webhook_events insert
// (i.e., the ping was already processed).
let insertConflict = false
// Pre-read result used by the sale-ping handler when detecting first sale vs
// renewal. Default: no existing row (first sale). Tests can override.
let workspaceBefore: Record<string, unknown> | null = null

function makeBuilder(table: string) {
  return {
    insert: (row: Record<string, unknown>) => {
      inserts.push({ table, row })
      return Promise.resolve({
        error: insertConflict ? { code: '23505', message: 'duplicate' } : null,
      })
    },
    select: (_cols: string) => ({
      eq: (_column: string, _value: unknown) => ({
        maybeSingle: () => Promise.resolve({ data: workspaceBefore, error: null }),
      }),
    }),
    update: (patch: Record<string, unknown>) => ({
      eq: (column: string, value: unknown) => {
        updates.push({ table, patch, where: { [column]: value } })
        return Promise.resolve({ error: null })
      },
    }),
  }
}

vi.mock('@/lib/db/client', () => ({
  db: { from: (table: string) => makeBuilder(table) },
  hasValidDatabaseUrl: true,
}))

vi.mock('next/headers', () => ({
  headers: () => ({
    get: (name: string) => {
      if (name === 'x-forwarded-for') return '127.0.0.1'
      if (name === 'content-type') return 'application/x-www-form-urlencoded'
      return null
    },
  }),
}))

vi.mock('@/lib/utils/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ success: true })),
  rateLimitResponse: vi.fn(
    (resetAt: number) =>
      new Response(JSON.stringify({ error: 'RATE_LIMIT', resetAt }), { status: 429 })
  ),
  RATE_LIMITS: { webhook: { max: 60, windowMs: 60000 } },
}))

const SECRET = 'test-secret-abc123'
process.env.GUMROAD_WEBHOOK_SECRET = SECRET

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function callWebhook(secret: string, formFields: Record<string, string>) {
  const { POST } = await import('@/app/api/v1/webhooks/gumroad/[secret]/route')
  const body = new URLSearchParams(formFields).toString()
  const req = new Request(
    `http://localhost:3000/api/v1/webhooks/gumroad/${secret}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    }
  )
  return POST(req, { params: { secret } })
}

beforeEach(() => {
  updates.length = 0
  inserts.length = 0
  insertConflict = false
  workspaceBefore = null
  vi.clearAllMocks()
})

// -----------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------

describe('Gumroad webhook — auth', () => {
  it('rejects wrong secret with 401', async () => {
    const res = await callWebhook('wrong-secret', { sale_id: 's1' })
    expect(res.status).toBe(401)
    expect(updates).toHaveLength(0)
  })

  it('rejects mismatched length with 401 (timing-safe path)', async () => {
    const res = await callWebhook('short', { sale_id: 's1' })
    expect(res.status).toBe(401)
  })

  it('returns 503 when server has no secret configured', async () => {
    const original = process.env.GUMROAD_WEBHOOK_SECRET
    delete process.env.GUMROAD_WEBHOOK_SECRET
    const res = await callWebhook(SECRET, { sale_id: 's1' })
    expect(res.status).toBe(503)
    process.env.GUMROAD_WEBHOOK_SECRET = original
  })
})

// -----------------------------------------------------------------------
// Sale ping → workspace upgrade (the critical happy path)
// -----------------------------------------------------------------------

describe('Gumroad webhook — sale ping upgrades workspace', () => {
  it('stamps plan, subscription id, manage url, and customer email', async () => {
    const res = await callWebhook(SECRET, {
      sale_id: 'sale_001',
      subscription_id: 'sub_xyz',
      email: 'buyer@example.com',
      'url_params[workspace_id]': 'ws-42',
      'url_params[plan]': 'pro',
      'url_params[interval]': 'monthly',
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ received: true })

    // Idempotency row inserted
    const webhookInsert = inserts.find((i) => i.table === 'webhook_events')
    expect(webhookInsert).toBeDefined()
    expect(webhookInsert?.row.event_id).toBe('gumroad:sale:sale_001')

    // Workspace updated with the full set of fields
    const wsUpdate = updates.find((u) => u.table === 'workspaces')
    expect(wsUpdate).toBeDefined()
    expect(wsUpdate?.where).toEqual({ id: 'ws-42' })
    expect(wsUpdate?.patch).toMatchObject({
      plan: 'pro',
      gr_customer_email: 'buyer@example.com',
      gr_subscription_id: 'sub_xyz',
      gr_subscription_manage_url:
        'https://app.gumroad.com/subscriptions/sub_xyz/manage',
    })
  })

  it('defaults to starter plan when url_params[plan] is missing', async () => {
    const res = await callWebhook(SECRET, {
      sale_id: 'sale_002',
      subscription_id: 'sub_abc',
      email: 'b@x.com',
      'url_params[workspace_id]': 'ws-9',
    })
    expect(res.status).toBe(200)
    const wsUpdate = updates.find((u) => u.table === 'workspaces')
    expect(wsUpdate?.patch.plan).toBe('starter')
  })

  it('ignores sale ping without workspace_id (no DB writes)', async () => {
    const res = await callWebhook(SECRET, {
      sale_id: 'sale_003',
      subscription_id: 'sub_nope',
      email: 'x@y.com',
    })
    expect(res.status).toBe(200)
    expect(updates.filter((u) => u.table === 'workspaces')).toHaveLength(0)
  })

  it('stamps trial_ends_at on first sale (no prior subscription)', async () => {
    workspaceBefore = { gr_subscription_id: null, trial_ends_at: null }
    const res = await callWebhook(SECRET, {
      sale_id: 'sale_first',
      subscription_id: 'sub_new',
      email: 'first@x.com',
      'url_params[workspace_id]': 'ws-new',
      'url_params[plan]': 'starter',
    })
    expect(res.status).toBe(200)
    const wsUpdate = updates.find((u) => u.table === 'workspaces')
    expect(wsUpdate?.patch.trial_ends_at).toBeDefined()
    const trialEnd = new Date(wsUpdate?.patch.trial_ends_at as string).getTime()
    const expected = Date.now() + 30 * 24 * 60 * 60 * 1000
    // Within a minute of the expected 30-day window
    expect(Math.abs(trialEnd - expected)).toBeLessThan(60_000)
  })

  it('does NOT re-stamp trial_ends_at on renewal (existing subscription)', async () => {
    workspaceBefore = {
      gr_subscription_id: 'sub_existing',
      trial_ends_at: '2026-05-01T00:00:00.000Z',
    }
    const res = await callWebhook(SECRET, {
      sale_id: 'sale_renewal',
      subscription_id: 'sub_existing',
      email: 'renewal@x.com',
      'url_params[workspace_id]': 'ws-renew',
      'url_params[plan]': 'pro',
    })
    expect(res.status).toBe(200)
    const wsUpdate = updates.find((u) => u.table === 'workspaces')
    expect(wsUpdate?.patch.trial_ends_at).toBeUndefined()
  })
})

// -----------------------------------------------------------------------
// Subscription lifecycle pings
// -----------------------------------------------------------------------

describe('Gumroad webhook — subscription lifecycle', () => {
  it('subscription_cancelled → downgrades to free', async () => {
    const res = await callWebhook(SECRET, {
      resource_name: 'subscription_cancelled',
      subscription_id: 'sub_cancel',
    })
    expect(res.status).toBe(200)
    const u = updates.find((u) => u.table === 'workspaces')
    expect(u?.where).toEqual({ gr_subscription_id: 'sub_cancel' })
    expect(u?.patch).toMatchObject({ plan: 'free', gr_subscription_id: null })
  })

  it('subscription_ended → downgrades to free', async () => {
    const res = await callWebhook(SECRET, {
      resource_name: 'subscription_ended',
      subscription_id: 'sub_ended',
    })
    expect(res.status).toBe(200)
    expect(updates[0]?.patch).toMatchObject({ plan: 'free' })
  })

  it('refunded → immediate downgrade', async () => {
    const res = await callWebhook(SECRET, {
      resource_name: 'refunded',
      subscription_id: 'sub_refund',
      sale_id: 'sale_refund',
    })
    expect(res.status).toBe(200)
    const u = updates.find((u) => u.table === 'workspaces')
    expect(u?.patch).toMatchObject({ plan: 'free', gr_subscription_id: null })
  })

  it('dispute → immediate downgrade', async () => {
    const res = await callWebhook(SECRET, {
      resource_name: 'dispute',
      subscription_id: 'sub_dispute',
      sale_id: 'sale_dispute',
    })
    expect(res.status).toBe(200)
    const u = updates.find((u) => u.table === 'workspaces')
    expect(u?.patch).toMatchObject({ plan: 'free' })
  })

  it('subscription_updated → refreshes manage url, preserves plan', async () => {
    const res = await callWebhook(SECRET, {
      resource_name: 'subscription_updated',
      subscription_id: 'sub_upd',
    })
    expect(res.status).toBe(200)
    const u = updates.find((u) => u.table === 'workspaces')
    expect(u?.patch.gr_subscription_manage_url).toBe(
      'https://app.gumroad.com/subscriptions/sub_upd/manage'
    )
    expect(u?.patch.plan).toBeUndefined() // plan untouched
  })

  it('subscription_restarted → refreshes manage url, leaves plan for next sale', async () => {
    const res = await callWebhook(SECRET, {
      resource_name: 'subscription_restarted',
      subscription_id: 'sub_restart',
    })
    expect(res.status).toBe(200)
    const u = updates.find((u) => u.table === 'workspaces')
    expect(u?.patch.gr_subscription_manage_url).toContain('sub_restart')
    expect(u?.patch.plan).toBeUndefined()
  })
})

// -----------------------------------------------------------------------
// Idempotency & unknowns
// -----------------------------------------------------------------------

describe('Gumroad webhook — idempotency & unknowns', () => {
  it('duplicate delivery (23505 on webhook_events) is acknowledged without re-processing', async () => {
    insertConflict = true
    const res = await callWebhook(SECRET, {
      sale_id: 'sale_dup',
      subscription_id: 'sub_dup',
      email: 'd@x.com',
      'url_params[workspace_id]': 'ws-1',
      'url_params[plan]': 'starter',
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ received: true, duplicate: true })
    // No workspace mutation — the handler bailed before the switch
    expect(updates.filter((u) => u.table === 'workspaces')).toHaveLength(0)
  })

  it('unknown resource → 200 ack with no mutations', async () => {
    const res = await callWebhook(SECRET, {
      resource_name: 'some_future_event_type',
      subscription_id: 'sub_future',
    })
    expect(res.status).toBe(200)
    expect(updates.filter((u) => u.table === 'workspaces')).toHaveLength(0)
  })
})
