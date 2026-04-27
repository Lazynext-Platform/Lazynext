import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

const updateSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        positionX: z.number().int(),
        positionY: z.number().int(),
      }),
    )
    .min(1)
    .max(200),
})

// POST /api/v1/nodes/positions
// Body: { updates: [{ id, positionX, positionY }, ...] }
//
// Batch position-only update, used by:
//   1. The debounced canvas position-persist hook to coalesce many
//      rapid drags into one round-trip.
//   2. `navigator.sendBeacon` on page teardown — beacons can only POST,
//      so the per-node PATCH endpoint can't be used there. POSTing here
//      gives us a single guaranteed flush of every pending position.
//
// Member auth runs once per workspace touched, then we update each
// node individually (Postgres has no native "case-insensitive bulk
// update" without a CTE we'd need to build by hand). For 200 nodes
// this is still well under the route's response budget.
export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Group updates by workspace via a single SELECT, then auth once per
  // workspace before we touch any rows.
  const ids = parsed.data.updates.map((u) => u.id)
  const { data: rows } = await db
    .from('nodes')
    .select('id, workspace_id')
    .in('id', ids)

  if (!rows || rows.length === 0) {
    return NextResponse.json({ data: { updated: 0 }, error: null })
  }

  const workspaceIds = new Set<string>()
  const wsByNode = new Map<string, string>()
  for (const r of rows as Array<{ id: string; workspace_id: string }>) {
    workspaceIds.add(r.workspace_id)
    wsByNode.set(r.id, r.workspace_id)
  }

  for (const wsId of workspaceIds) {
    const ok = await verifyWorkspaceMember(userId, wsId)
    if (!ok) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
  }

  let updated = 0
  for (const u of parsed.data.updates) {
    if (!wsByNode.has(u.id)) continue
    const { error } = await db
      .from('nodes')
      .update({ position_x: u.positionX, position_y: u.positionY, updated_by: userId })
      .eq('id', u.id)
    if (!error) updated++
  }

  return NextResponse.json({ data: { updated }, error: null })
}
