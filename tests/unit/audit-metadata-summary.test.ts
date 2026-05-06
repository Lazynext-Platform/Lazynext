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
})
