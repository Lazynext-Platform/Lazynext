import type { AuditAction, AuditView } from '@/lib/data/audit-log'

/**
 * Human-readable label for every `AuditAction`. Exhaustive — every
 * member of the union has a case so adding a new action without
 * updating this map is a TypeScript error.
 */
export function formatAuditAction(action: AuditAction): string {
  switch (action) {
    case 'workspace.update':
      return 'Workspace updated'
    case 'workspace.delete':
      return 'Workspace deleted'
    case 'decision.create':
      return 'Decision logged'
    case 'decision.update':
      return 'Decision edited'
    case 'decision.delete':
      return 'Decision deleted'
    case 'node.create':
      return 'Node created'
    case 'node.update':
      return 'Node edited'
    case 'node.delete':
      return 'Node deleted'
    case 'member.invite':
      return 'Member invited'
    case 'member.remove':
      return 'Member removed'
    case 'member.role_update':
      return 'Member role changed'
    case 'api_key.create':
      return 'API key created'
    case 'api_key.rotate':
      return 'API key rotated'
    case 'api_key.revoke':
      return 'API key revoked'
    case 'ai.workflow.generated':
      return 'AI workflow generated'
    case 'ai.workflow.accepted':
      return 'AI workflow accepted'
    case 'ai.workflow.refined':
      return 'AI workflow refined'
  }
}

/**
 * Color hint per action category. Returned as a Tailwind class name so
 * the renderer can pick its own background/foreground variant. Pure —
 * no DOM, no theme lookups.
 */
export function actionTone(
  action: AuditAction,
): 'red' | 'amber' | 'emerald' | 'sky' | 'slate' {
  if (action.endsWith('.delete') || action.endsWith('.revoke') || action === 'member.remove') return 'red'
  if (action.endsWith('.create') || action === 'member.invite' || action === 'api_key.rotate') return 'emerald'
  if (action.startsWith('ai.workflow')) return 'sky'
  if (action === 'workspace.update' || action === 'member.role_update') return 'amber'
  return 'slate'
}

/**
 * "3m ago" / "2h ago" / "5d ago" / "Apr 18, 2026". Pure, deterministic
 * given a `now`, so unit tests don't need to mock Date.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return '—'
  const diff = now.getTime() - ts
  if (diff < 0) return 'just now'
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  if (day < 30) return `${Math.floor(day / 7)}w ago`
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

/**
 * Display string for an audit-row actor. Falls back through name →
 * email → "System" (null actor for system actions like cron jobs).
 */
export function formatActor(actor: AuditView['actor']): string {
  if (!actor) return 'System'
  return actor.name ?? actor.email ?? 'Unknown user'
}

// ─────────────────────────────────────────────────────────────
// Date-range filter (#45). Shared parser used by the loader, the
// JSON list endpoint, the CSV endpoint, and the page UI so that
// validation never drifts between layers.
// ─────────────────────────────────────────────────────────────

export type AuditRange = '7' | '30' | '90' | '365' | 'all'

const VALID_RANGES = new Set<AuditRange>(['7', '30', '90', '365', 'all'])

/**
 * Coerce a query-string value into an `AuditRange`. Anything we don't
 * recognise (including undefined / null / 'now' / '1y' / negative
 * numbers) collapses to the default 'all' so URLs never 400 because a
 * user mangled the param.
 */
export function parseAuditRange(input: string | null | undefined): AuditRange {
  if (!input) return 'all'
  return VALID_RANGES.has(input as AuditRange) ? (input as AuditRange) : 'all'
}

/**
 * ISO timestamp `range` days before `now`, or `null` for 'all'.
 * Pure & deterministic for tests.
 */
export function rangeCutoffIso(range: AuditRange, now: Date = new Date()): string | null {
  if (range === 'all') return null
  const days = Number(range)
  return new Date(now.getTime() - days * 86_400_000).toISOString()
}

/**
 * Human label for the dropdown / tooltips.
 */
export function formatAuditRange(range: AuditRange): string {
  switch (range) {
    case '7':
      return 'Last 7 days'
    case '30':
      return 'Last 30 days'
    case '90':
      return 'Last 90 days'
    case '365':
      return 'Last year'
    case 'all':
      return 'All time'
  }
}
