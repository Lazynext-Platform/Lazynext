import { describe, it, expect } from 'vitest'
import { summarizeAuditMetadata } from '@/lib/utils/audit-format'

describe('summarizeAuditMetadata', () => {
  it('returns null for null/empty/non-object metadata', () => {
    expect(summarizeAuditMetadata('node.update', null)).toBeNull()
    expect(summarizeAuditMetadata('node.update', undefined)).toBeNull()
    expect(summarizeAuditMetadata('node.update', {})).toBeNull()
  })

  it('summarises node.update / decision.update with a changes array', () => {
    expect(
      summarizeAuditMetadata('node.update', { changes: ['title', 'status'], viaApiKey: false }),
    ).toBe('Edited: title, status')
    expect(
      summarizeAuditMetadata('decision.update', { changes: ['question'] }),
    ).toBe('Edited: question')
  })

  it('appends "via API key" when viaApiKey is true', () => {
    expect(
      summarizeAuditMetadata('node.update', { changes: ['title'], viaApiKey: true }),
    ).toBe('Edited: title · via API key')
  })

  it('handles workspace.update name + slug rename', () => {
    expect(
      summarizeAuditMetadata('workspace.update', {
        changes: { name: 'New Co', slug: 'new-co' },
        previous: { name: 'Old Co', slug: 'old-co' },
      }),
    ).toBe('Renamed "Old Co" → "New Co" · Slug "old-co" → "new-co"')
  })

  it('falls back to "Edited: <keys>" when workspace.update has no rename', () => {
    expect(
      summarizeAuditMetadata('workspace.update', {
        changes: { plan: 'pro' },
        previous: {},
      }),
    ).toBe('Edited: plan')
  })

  it('summarises node.create with type + title and truncates long titles', () => {
    expect(
      summarizeAuditMetadata('node.create', { type: 'task', title: 'Ship it' }),
    ).toBe('Created task: "Ship it"')
    const long = 'x'.repeat(80)
    const summary = summarizeAuditMetadata('node.create', { type: 'doc', title: long }) ?? ''
    expect(summary.length).toBeLessThanOrEqual('Created doc: "'.length + 60 + 1 + 1)
    expect(summary).toContain('…')
  })

  it('summarises decision.create with question + score', () => {
    expect(
      summarizeAuditMetadata('decision.create', {
        question: 'Should we adopt RSC?',
        qualityScore: 82,
        decisionType: 'reversible',
      }),
    ).toBe('"Should we adopt RSC?" · score 82')
  })

  it('returns null for delete actions with empty/no-flag metadata', () => {
    expect(summarizeAuditMetadata('node.delete', { viaApiKey: false })).toBeNull()
    expect(summarizeAuditMetadata('decision.delete', {})).toBeNull()
  })

  it('flags API-key-driven deletes', () => {
    expect(summarizeAuditMetadata('node.delete', { viaApiKey: true })).toBe(
      'Deleted · via API key',
    )
  })

  it('summarises api_key.* with name + prefix when present', () => {
    expect(
      summarizeAuditMetadata('api_key.create', { name: 'CI Bot', prefix: 'lzx_abc' }),
    ).toBe('CI Bot (lzx_abc…)')
    expect(summarizeAuditMetadata('api_key.revoke', { prefix: 'lzx_xyz' })).toBe('lzx_xyz')
  })

  it('summarises member.* using email + role', () => {
    expect(
      summarizeAuditMetadata('member.role_update', { email: 'a@b.com', role: 'admin' }),
    ).toBe('a@b.com · admin')
    expect(summarizeAuditMetadata('member.invite', { email: 'a@b.com' })).toBe('a@b.com')
  })

  it('summarises ai.workflow.* with prompt + nodeCount', () => {
    expect(
      summarizeAuditMetadata('ai.workflow.generated', {
        prompt: 'Plan a launch',
        nodeCount: 5,
      }),
    ).toBe('"Plan a launch" · 5 nodes')
    expect(
      summarizeAuditMetadata('ai.workflow.accepted', { nodeCount: 1 }),
    ).toBe('1 node')
  })

  it('returns null for workspace.delete (terminal action, no useful detail)', () => {
    expect(summarizeAuditMetadata('workspace.delete', { reason: 'whatever' })).toBeNull()
  })

  // ─────────────────────────────────────────────────────────────
  // #50: diff viewer for node.update / decision.update
  // ─────────────────────────────────────────────────────────────

  it('node.update with previous + next renders per-field arrows', () => {
    expect(
      summarizeAuditMetadata('node.update', {
        changes: ['title', 'status'],
        previous: { title: 'Old', status: 'todo' },
        next: { title: 'New', status: 'done' },
      }),
    ).toBe('title: "Old" → "New" · status: "todo" → "done"')
  })

  it('node.update arrows truncate long string values to 40 chars', () => {
    const long = 'x'.repeat(80)
    const result = summarizeAuditMetadata('node.update', {
      previous: { title: 'Old' },
      next: { title: long },
    }) ?? ''
    expect(result).toContain('"Old" → "')
    expect(result).toContain('…"')
  })

  it('node.update collapses to "+N more" when more than 3 fields changed', () => {
    const result = summarizeAuditMetadata('node.update', {
      previous: { a: 1, b: 1, c: 1, d: 1, e: 1 },
      next: { a: 2, b: 2, c: 2, d: 2, e: 2 },
    })
    expect(result).toContain('(+2 more)')
  })

  it('node.update renders null/undefined as em-dash', () => {
    expect(
      summarizeAuditMetadata('node.update', {
        previous: { assignedTo: null },
        next: { assignedTo: 'user-uuid' },
      }),
    ).toBe('assignedTo: — → "user-uuid"')
  })

  it('node.update appends "via API key" on bearer-driven edits', () => {
    expect(
      summarizeAuditMetadata('node.update', {
        previous: { title: 'a' },
        next: { title: 'b' },
        viaApiKey: true,
      }),
    ).toBe('title: "a" → "b" · via API key')
  })

  it('node.update falls back to legacy "Edited: …" when no diff snapshot', () => {
    expect(
      summarizeAuditMetadata('node.update', { changes: ['data'] }),
    ).toBe('Edited: data')
  })

  it('node.update collapses non-string/number/bool values to placeholders', () => {
    expect(
      summarizeAuditMetadata('node.update', {
        previous: { tags: ['old'] },
        next: { tags: ['a', 'b', 'c'] },
      }),
    ).toBe('tags: [1] → [3]')
  })
})
