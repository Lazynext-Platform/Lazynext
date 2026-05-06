import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { requireWorkspaceAuth, requireScope } from '@/lib/utils/route-auth'
import { incrementWmsFor } from '@/lib/wms'
import { recordAudit } from '@/lib/data/audit-log'

const updateSchema = z.object({
  resolution: z.string().optional(),
  rationale: z.string().optional(),
  status: z.enum(['open', 'decided', 'reversed', 'deferred']).optional(),
  outcome: z.enum(['good', 'bad', 'neutral', 'pending']).optional(),
  outcomeNotes: z.string().optional(),
  outcomeConfidence: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Look up the decision first so we know which workspace to bind to.
  // This is a tiny indexed read; cheap enough to do before auth so we
  // can hand requireWorkspaceAuth a concrete workspaceId. The bearer
  // path then gets a free 403 WORKSPACE_MISMATCH if the key targets a
  // different workspace.
  const { data: decision, error } = await db
    .from('decisions')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !decision) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, decision.workspace_id)
  if (!auth.ok) return auth.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  return NextResponse.json({ data: decision, error: null })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Pull every field we might diff against into the audit row's
  // `previous` snapshot. Same pattern as nodes/[id] (#50). All these
  // columns are compact (no unbounded blob like `data` on nodes) so
  // the entire set is safe to snapshot.
  const { data: existing } = await db
    .from('decisions')
    .select('workspace_id, resolution, rationale, status, outcome, outcome_notes, outcome_confidence, tags')
    .eq('id', params.id)
    .single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, existing.workspace_id)
  if (!auth.ok) return auth.response
  const scopeFail = requireScope(auth, 'write')
  if (scopeFail) return scopeFail.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.resolution !== undefined) updateData.resolution = parsed.data.resolution
  if (parsed.data.rationale !== undefined) updateData.rationale = parsed.data.rationale
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status
  if (parsed.data.outcome !== undefined) updateData.outcome = parsed.data.outcome
  if (parsed.data.outcomeNotes !== undefined) updateData.outcome_notes = parsed.data.outcomeNotes
  if (parsed.data.outcomeConfidence !== undefined) updateData.outcome_confidence = parsed.data.outcomeConfidence
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags

  if (parsed.data.outcome && parsed.data.outcome !== 'pending') {
    updateData.outcome_tagged_by = auth.userId
    updateData.outcome_tagged_at = new Date().toISOString()
  }

  const { data: updated, error } = await db
    .from('decisions')
    .update(updateData)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // WMS: outcome transitions from pending to a real verdict are the moat's
  // compounding signal. Credit the workspace.
  if (parsed.data.outcome && parsed.data.outcome !== 'pending') {
    await incrementWmsFor(existing.workspace_id, 'outcome_recorded').catch(() => undefined)
  }

  // Audit (#51). Diff-shape compatible with the #50 reader: snapshot
  // each changed field's previous + next value. Camel-case snapshot
  // keys match the API surface, not the DB columns, so the audit
  // viewer summary reads naturally.
  void recordAudit({
    workspaceId: existing.workspace_id,
    actorId: auth.userId,
    action: 'decision.update',
    resourceType: 'decision',
    resourceId: params.id,
    metadata: (() => {
      const changes = Object.keys(parsed.data)
      const previous: Record<string, unknown> = {}
      const next: Record<string, unknown> = {}
      for (const k of changes) {
        const dbKey =
          k === 'outcomeNotes'
            ? 'outcome_notes'
            : k === 'outcomeConfidence'
              ? 'outcome_confidence'
              : k
        previous[k] = (existing as Record<string, unknown>)[dbKey] ?? null
        next[k] = (parsed.data as Record<string, unknown>)[k] ?? null
      }
      return { changes, previous, next, viaApiKey: auth.viaApiKey }
    })(),
    request: req,
  })

  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Snapshot the question for the audit summary so 'Deleted decision
  // "Should we adopt RSC?"' renders without a follow-up DB read.
  const { data: existing } = await db
    .from('decisions')
    .select('workspace_id, question')
    .eq('id', params.id)
    .single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const auth = await requireWorkspaceAuth(req, existing.workspace_id)
  if (!auth.ok) return auth.response
  const scopeFail = requireScope(auth, 'write')
  if (scopeFail) return scopeFail.response

  const rl = rateLimit(auth.rateLimitId, RATE_LIMITS.mutation)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  await db.from('decisions').delete().eq('id', params.id)

  void recordAudit({
    workspaceId: existing.workspace_id,
    actorId: auth.userId,
    action: 'decision.delete',
    resourceType: 'decision',
    resourceId: params.id,
    metadata: {
      question: typeof (existing as { question?: string }).question === 'string'
        ? String((existing as { question: string }).question).slice(0, 200)
        : null,
      viaApiKey: auth.viaApiKey,
    },
    request: req,
  })

  return NextResponse.json({ data: { deleted: true }, error: null })
}
