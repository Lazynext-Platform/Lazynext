import { NextResponse } from 'next/server'
import { requireWorkspaceAuth } from '@/lib/utils/route-auth'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { decisionsToCsv } from '@/lib/utils/decisions-csv'
import type { Decision } from '@/lib/db/schema'

// GET /api/v1/decisions/export.csv?workspaceId=<uuid>&range=7|30|90|365
// Returns the workspace's decision log as a streamed CSV download.
// Caller must be a member of the workspace OR present a valid bearer
// API key bound to that workspace.
export async function GET(req: Request) {
  if (!hasValidDatabaseUrl) {
    return NextResponse.json(
      { error: 'DATABASE_NOT_CONFIGURED' },
      { status: 503 },
    )
  }

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })
  }

  const auth = await requireWorkspaceAuth(req, workspaceId)
  if (!auth.ok) return auth.response

  // Heavy read — full workspace dump as CSV. Same tight bucket as
  // /export so a leaked key can't scrape the workspace via either
  // endpoint.
  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.export)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  let query = db
    .from('decisions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(2000)

  const range = url.searchParams.get('range')
  if (range && ['7', '30', '90', '365'].includes(range)) {
    const cutoff = new Date(Date.now() - Number(range) * 86_400_000).toISOString()
    query = query.gte('created_at', cutoff)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 })
  }

  const csv = decisionsToCsv((data ?? []) as Decision[])
  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="lazynext-decisions-${stamp}.csv"`,
      // No-cache: a fresh export every time.
      'cache-control': 'no-store',
    },
  })
}
