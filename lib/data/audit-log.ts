// ─── Audit log helpers ──────────────────────────────────────────────
// Append-only log of mutating actions. Hooked into workspace, decision,
// node, and member mutation routes. Surfaced under Activity → Audit Log
// for plans with the 'audit-log' feature gate (lib/utils/plan-gates.ts).
//
// recordAudit() never throws — audit failures must not block the
// underlying mutation. List/cursor pagination by created_at desc.

import { db, hasValidDatabaseUrl } from '@/lib/db/client'

export type AuditAction =
  | 'workspace.update'
  | 'workspace.delete'
  | 'decision.create'
  | 'decision.update'
  | 'decision.delete'
  | 'node.create'
  | 'node.update'
  | 'node.delete'
  | 'member.invite'
  | 'member.remove'
  | 'member.role_update'
  | 'api_key.create'
  | 'api_key.rotate'
  | 'api_key.revoke'
  // AI workflow generation (#41). `generated` is server-side; `accepted`
  // and `refined` are client-emitted when the user clicks the matching
  // button on the preview modal.
  | 'ai.workflow.generated'
  | 'ai.workflow.accepted'
  | 'ai.workflow.refined'

export interface AuditRow {
  id: string
  workspace_id: string
  actor_id: string | null
  action: AuditAction
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown>
  ip: string | null
  user_agent: string | null
  created_at: string
}

export interface RecordAuditInput {
  workspaceId: string
  actorId: string | null
  action: AuditAction
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown>
  request?: Request
}

function extractIp(req?: Request): string | null {
  if (!req) return null
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    // First entry is the originating client when behind multiple proxies.
    const first = fwd.split(',')[0]?.trim()
    return first || null
  }
  return req.headers.get('x-real-ip') ?? null
}

export async function recordAudit(input: RecordAuditInput): Promise<boolean> {
  if (!hasValidDatabaseUrl) return false
  try {
    const ip = extractIp(input.request)
    const userAgent = input.request?.headers.get('user-agent') ?? null
    const { error } = await db.from('audit_log').insert({
      workspace_id: input.workspaceId,
      actor_id: input.actorId,
      action: input.action,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      ip,
      user_agent: userAgent,
    })
    return !error
  } catch {
    return false
  }
}

export interface AuditView extends AuditRow {
  actor: {
    id: string | null
    name: string | null
    email: string | null
    avatarUrl: string | null
  } | null
}

/**
 * Page through audit rows, newest first. Cursor is the `created_at`
 * timestamp of the last row from the previous page.
 */
export async function listAuditLog(opts: {
  workspaceId: string
  limit?: number
  cursor?: string | null
  action?: AuditAction | null
}): Promise<{ items: AuditView[]; nextCursor: string | null }> {
  if (!hasValidDatabaseUrl) return { items: [], nextCursor: null }
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200)

  let q = db
    .from('audit_log')
    .select('*')
    .eq('workspace_id', opts.workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (opts.cursor) q = q.lt('created_at', opts.cursor)
  if (opts.action) q = q.eq('action', opts.action)

  const { data } = await q
  const rows = (data as AuditRow[] | null) ?? []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? page[page.length - 1].created_at : null

  // Hydrate actor metadata.
  const actorIds = Array.from(new Set(page.map((r) => r.actor_id).filter((v): v is string => !!v)))
  const actorMap = new Map<string, AuditView['actor']>()
  if (actorIds.length > 0) {
    try {
      const { data: usersRes } = await db.auth.admin.listUsers({ perPage: 200 })
      const users = usersRes?.users ?? []
      for (const u of users) {
        if (!actorIds.includes(u.id)) continue
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>
        actorMap.set(u.id, {
          id: u.id,
          name: (meta.full_name as string) ?? (meta.name as string) ?? null,
          email: u.email ?? null,
          avatarUrl: (meta.avatar_url as string) ?? null,
        })
      }
    } catch {
      // Treat as anonymous on lookup failure.
    }
  }

  const items: AuditView[] = page.map((r) => ({
    ...r,
    actor: r.actor_id ? actorMap.get(r.actor_id) ?? { id: r.actor_id, name: null, email: null, avatarUrl: null } : null,
  }))
  return { items, nextCursor }
}
