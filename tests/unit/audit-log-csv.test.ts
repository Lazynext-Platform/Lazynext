import { describe, it, expect } from 'vitest'
import { auditLogToCsv, AUDIT_CSV_HEADERS, AUDIT_CSV_CAP } from '@/lib/utils/audit-log-csv'
import type { AuditRow } from '@/lib/data/audit-log'

function makeRow(over: Partial<AuditRow> = {}): AuditRow {
  return {
    id: 'r-1',
    workspace_id: 'w-1',
    actor_id: 'u-1',
    action: 'decision.create',
    resource_type: 'decision',
    resource_id: 'd-1',
    metadata: {},
    ip: '203.0.113.7',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-05-06T10:00:00.000Z',
    ...over,
  }
}

describe('auditLogToCsv', () => {
  it('emits header only on empty input', () => {
    const csv = auditLogToCsv([])
    expect(csv).toBe(AUDIT_CSV_HEADERS.join(','))
    // No trailing newline on header-only output (RFC 4180 allows both;
    // we pick "no" to match decisions-csv).
    expect(csv).not.toContain('\r\n')
  })

  it('uses CRLF line terminators between header and rows', () => {
    const csv = auditLogToCsv([makeRow()])
    const parts = csv.split('\r\n')
    expect(parts.length).toBe(2)
    expect(parts[0]).toBe(AUDIT_CSV_HEADERS.join(','))
  })

  it('keeps simple values unescaped', () => {
    const csv = auditLogToCsv([makeRow()])
    const dataRow = csv.split('\r\n')[1]
    expect(dataRow.startsWith('r-1,2026-05-06T10:00:00.000Z,w-1,u-1,decision.create,decision,d-1,')).toBe(true)
  })

  it('escapes RFC 4180 special characters', () => {
    const csv = auditLogToCsv([
      makeRow({
        user_agent: 'Bot,with,commas',
        resource_id: 'has "quotes" inside',
        ip: 'has\nnewline',
      }),
    ])
    expect(csv).toContain('"Bot,with,commas"')
    expect(csv).toContain('"has ""quotes"" inside"')
    expect(csv).toContain('"has\nnewline"')
  })

  it('serializes object metadata as a JSON-string cell', () => {
    const csv = auditLogToCsv([
      makeRow({ metadata: { reason: 'manual', count: 3 } }),
    ])
    // The JSON contains a comma so it must be wrapped + inner quotes doubled.
    expect(csv).toContain('"{""reason"":""manual"",""count"":3}"')
  })

  it('emits empty cells for null actor_id / resource_id / ip', () => {
    const csv = auditLogToCsv([
      makeRow({ actor_id: null, resource_id: null, ip: null, user_agent: null }),
    ])
    const dataRow = csv.split('\r\n')[1]
    expect(dataRow).toBe('r-1,2026-05-06T10:00:00.000Z,w-1,,decision.create,decision,,{},,')
  })

  it('preserves header column order (regression sentinel)', () => {
    expect(AUDIT_CSV_HEADERS).toEqual([
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
    ])
  })

  it('exposes a 5000-row cap constant', () => {
    expect(AUDIT_CSV_CAP).toBe(5000)
  })
})
