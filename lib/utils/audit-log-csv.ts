import type { AuditRow } from '@/lib/data/audit-log'

/**
 * RFC 4180-ish CSV serializer for audit-log rows. Mirrors the shape of
 * `lib/utils/decisions-csv.ts` so both exports behave identically:
 * doubled inner quotes, comma/newline-bearing fields wrapped, JSON
 * objects collapsed to a JSON-string cell, CRLF line terminators.
 *
 * Why no actor hydration here?
 * - `listAuditLog`'s actor lookup is bounded to `perPage: 200` users.
 *   At the 5000-row CSV cap that's unsafe (sparse / wrong mappings).
 * - CSVs are joined externally via the tooling that consumes them;
 *   `actor_id` is the stable join key. Emails change.
 */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return escapeCell(value.join('; '))
  if (typeof value === 'object') return escapeCell(JSON.stringify(value))
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(cells: unknown[]): string {
  return cells.map(escapeCell).join(',')
}

export const AUDIT_CSV_HEADERS = [
  'id',
  'created_at',
  'workspace_id',
  'actor_id',
  'action',
  'resource_type',
  'resource_id',
  'metadata',
  'ip',
  'user_agent',
] as const

export const AUDIT_CSV_CAP = 5000

export function auditLogToCsv(rows: AuditRow[]): string {
  const lines: string[] = [AUDIT_CSV_HEADERS.join(',')]
  for (const r of rows) {
    lines.push(
      row([
        r.id,
        r.created_at,
        r.workspace_id,
        r.actor_id,
        r.action,
        r.resource_type,
        r.resource_id,
        r.metadata,
        r.ip,
        r.user_agent,
      ]),
    )
  }
  // RFC 4180: line terminators are CRLF.
  return lines.join('\r\n')
}
