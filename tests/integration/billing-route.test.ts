import { describe, it, expect, vi, beforeEach } from 'vitest'

// -----------------------------------------------------------------------
// Tiny Supabase fake — chainable .from(table).select().eq().maybeSingle()
// and .from(table).select(opts, head:true).eq() for count queries.
// -----------------------------------------------------------------------

type Workspace = {
  id: string
  plan: string
  trial_ends_at: string | null
  gr_customer_email: string | null
  gr_subscription_id: string | null
  gr_subscription_manage_url: string | null
}

let workspace: Workspace | null = null
let membership: { id: string } | null = null
let counts: Record<string, number> = { workspace_members: 0, nodes: 0, workflows: 0 }
let hasValidDatabaseUrlMock = true

function makeBuilder(table: string) {
  return {
    select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
      // Count-style: from(table).select('id', { count: 'exact', head: true }).eq(...)
      if (opts?.count === 'exact') {
        return {
          eq: (_col: string, _val: unknown) =>
            Promise.resolve({ count: counts[table] ?? 0, error: null }),
        }
      }
      // Lookup-style: from(table).select(...).eq(...).maybeSingle()
      return {
        eq: (_col: string, _val: unknown) => ({
          eq: (_col2: string, _val2: unknown) => ({
            maybeSingle: () => Promise.resolve({ data: membership, error: null }),
          }),
          maybeSingle: () =>
            table === 'workspaces'
              ? Promise.resolve({ data: workspace, error: null })
              : Promise.resolve({ data: membership, error: null }),
        }),
      }
    },
  }
}

vi.mock('@/lib/db/client', () => ({
  db: { from: (table: string) => makeBuilder(table) },
  get hasValidDatabaseUrl() {
    return hasValidDatabaseUrlMock
  },
}))

const safeAuthMock = vi.fn(() => Promise.resolve({ userId: 'user-1' as string | null }))
vi.mock('@/lib/utils/auth', () => ({
  safeAuth: () => safeAuthMock(),
}))

beforeEach(() => {
  hasValidDatabaseUrlMock = true
  workspace = null
  membership = null
  counts = { workspace_members: 0, nodes: 0, workflows: 0 }
  safeAuthMock.mockResolvedValue({ userId: 'user-1' })
  vi.clearAllMocks()
})

async function callBilling(slug: string) {
  const { GET } = await import('@/app/api/v1/workspace/[slug]/billing/route')
  const req = new Request(`http://localhost:3000/api/v1/workspace/${slug}/billing`)
  return GET(req, { params: { slug } })
}

describe('GET /api/v1/workspace/[slug]/billing', () => {
  it('returns 401 when unauthenticated', async () => {
    safeAuthMock.mockResolvedValueOnce({ userId: null })
    const res = await callBilling('any-slug')
    expect(res.status).toBe(401)
  })

  it('returns dev fallback when DB is not configured', async () => {
    hasValidDatabaseUrlMock = false
    const res = await callBilling('whatever')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.plan).toBe('free')
    expect(json.data.usage.members.count).toBe(1)
    expect(json.data.gr_subscription_id).toBeNull()
  })

  it('returns 404 when workspace slug does not exist', async () => {
    workspace = null
    const res = await callBilling('does-not-exist')
    expect(res.status).toBe(404)
  })

  it('returns 403 when user is not a workspace member', async () => {
    workspace = {
      id: 'ws-1',
      plan: 'starter',
      trial_ends_at: null,
      gr_customer_email: null,
      gr_subscription_id: null,
      gr_subscription_manage_url: null,
    }
    membership = null
    const res = await callBilling('test-ws')
    expect(res.status).toBe(403)
  })

  it('returns plan + usage + manage url for an authenticated member', async () => {
    workspace = {
      id: 'ws-42',
      plan: 'starter',
      trial_ends_at: '2030-01-01T00:00:00.000Z',
      gr_customer_email: 'buyer@example.com',
      gr_subscription_id: 'sub_abc',
      gr_subscription_manage_url: 'https://app.gumroad.com/subscriptions/sub_abc/manage',
    }
    membership = { id: 'member-1' }
    counts = { workspace_members: 3, nodes: 17, workflows: 4 }

    const res = await callBilling('test-ws')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.plan).toBe('starter')
    expect(json.data.gr_subscription_id).toBe('sub_abc')
    expect(json.data.gr_customer_email).toBe('buyer@example.com')
    expect(json.data.gr_subscription_manage_url).toContain('/subscriptions/sub_abc/manage')
    expect(json.data.usage.members.count).toBe(3)
    expect(json.data.usage.nodes.count).toBe(17)
    expect(json.data.usage.workflows.count).toBe(4)
    // Trial countdown should be a positive integer for a future date
    expect(typeof json.data.daysUntilTrialEnd).toBe('number')
    expect(json.data.daysUntilTrialEnd).toBeGreaterThan(0)
  })

  it('clamps trial countdown to 0 when trial_ends_at is in the past', async () => {
    workspace = {
      id: 'ws-old',
      plan: 'starter',
      trial_ends_at: '2020-01-01T00:00:00.000Z',
      gr_customer_email: null,
      gr_subscription_id: null,
      gr_subscription_manage_url: null,
    }
    membership = { id: 'member-1' }
    const res = await callBilling('past-trial')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.daysUntilTrialEnd).toBe(0)
  })

  it('returns null daysUntilTrialEnd when there is no trial', async () => {
    workspace = {
      id: 'ws-free',
      plan: 'free',
      trial_ends_at: null,
      gr_customer_email: null,
      gr_subscription_id: null,
      gr_subscription_manage_url: null,
    }
    membership = { id: 'member-1' }
    const res = await callBilling('free-ws')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.daysUntilTrialEnd).toBeNull()
  })
})
