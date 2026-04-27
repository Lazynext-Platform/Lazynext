import type { Decision } from '@/lib/db/schema'

// Tiny RFC 4180-ish CSV serializer. Avoids the Papa Parse dep — we
// need stable, escaped, deterministic output and nothing fancier.
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

const HEADERS = [
  'id',
  'created_at',
  'made_by',
  'question',
  'resolution',
  'rationale',
  'decision_type',
  'status',
  'outcome',
  'outcome_notes',
  'outcome_tagged_at',
  'quality_score',
  'options_considered',
  'stakeholders',
  'tags',
  'expected_by',
  'is_public',
] as const

/**
 * Serializes a list of `Decision` records to CSV. Columns mirror the
 * Decision DNA exec report's underlying data so the export and the
 * print-to-PDF report stay in lockstep.
 */
export function decisionsToCsv(decisions: Decision[]): string {
  const lines: string[] = [HEADERS.join(',')]
  for (const d of decisions) {
    lines.push(
      row([
        d.id,
        d.created_at,
        d.made_by,
        d.question,
        d.resolution,
        d.rationale,
        d.decision_type,
        d.status,
        d.outcome,
        d.outcome_notes,
        d.outcome_tagged_at,
        d.quality_score,
        d.options_considered,
        d.stakeholders,
        d.tags,
        d.expected_by,
        d.is_public,
      ]),
    )
  }
  // RFC 4180: CRLF line terminators.
  return lines.join('\r\n') + '\r\n'
}
