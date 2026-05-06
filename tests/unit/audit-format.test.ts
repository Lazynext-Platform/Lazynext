import { describe, it, expect } from 'vitest'
import {
  formatAuditAction,
  actionTone,
  formatRelativeTime,
  formatActor,
} from '@/lib/utils/audit-format'
import type { AuditAction } from '@/lib/data/audit-log'

const ALL_ACTIONS: AuditAction[] = [
  'workspace.update',
  'workspace.delete',
  'decision.create',
  'decision.update',
  'decision.delete',
  'node.create',
  'node.update',
  'node.delete',
  'member.invite',
  'member.remove',
  'member.role_update',
  'api_key.create',
  'api_key.rotate',
  'api_key.revoke',
  'ai.workflow.generated',
  'ai.workflow.accepted',
  'ai.workflow.refined',
]

describe('formatAuditAction', () => {
  it('returns a non-empty label for every AuditAction', () => {
    for (const a of ALL_ACTIONS) {
      const label = formatAuditAction(a)
      expect(label).toBeTruthy()
      expect(label).not.toContain('.')
    }
  })

  it('produces specific labels (regression sentinels)', () => {
    expect(formatAuditAction('decision.create')).toBe('Decision logged')
    expect(formatAuditAction('member.role_update')).toBe('Member role changed')
    expect(formatAuditAction('ai.workflow.accepted')).toBe('AI workflow accepted')
  })
})

describe('actionTone', () => {
  it('paints destructive actions red', () => {
    expect(actionTone('workspace.delete')).toBe('red')
    expect(actionTone('node.delete')).toBe('red')
    expect(actionTone('decision.delete')).toBe('red')
    expect(actionTone('api_key.revoke')).toBe('red')
    expect(actionTone('member.remove')).toBe('red')
  })

  it('paints creations emerald', () => {
    expect(actionTone('decision.create')).toBe('emerald')
    expect(actionTone('node.create')).toBe('emerald')
    expect(actionTone('member.invite')).toBe('emerald')
    expect(actionTone('api_key.rotate')).toBe('emerald')
  })

  it('paints AI workflow events sky', () => {
    expect(actionTone('ai.workflow.generated')).toBe('sky')
    expect(actionTone('ai.workflow.accepted')).toBe('sky')
  })

  it('paints config edits amber', () => {
    expect(actionTone('workspace.update')).toBe('amber')
    expect(actionTone('member.role_update')).toBe('amber')
  })

  it('falls back to slate for everything else', () => {
    expect(actionTone('node.update')).toBe('slate')
    expect(actionTone('decision.update')).toBe('slate')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-05-06T12:00:00.000Z')

  it('handles seconds', () => {
    expect(formatRelativeTime('2026-05-06T11:59:30.000Z', now)).toBe('30s ago')
  })
  it('handles minutes', () => {
    expect(formatRelativeTime('2026-05-06T11:55:00.000Z', now)).toBe('5m ago')
  })
  it('handles hours', () => {
    expect(formatRelativeTime('2026-05-06T09:00:00.000Z', now)).toBe('3h ago')
  })
  it('handles days', () => {
    expect(formatRelativeTime('2026-05-04T12:00:00.000Z', now)).toBe('2d ago')
  })
  it('handles weeks', () => {
    expect(formatRelativeTime('2026-04-22T12:00:00.000Z', now)).toBe('2w ago')
  })
  it('falls back to absolute date past 30 days', () => {
    expect(formatRelativeTime('2026-03-01T12:00:00.000Z', now)).toMatch(/Mar 0?1, 2026/)
  })
  it('handles future timestamps gracefully', () => {
    expect(formatRelativeTime('2026-05-06T13:00:00.000Z', now)).toBe('just now')
  })
  it('returns a dash on garbage input', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('—')
  })
})

describe('formatActor', () => {
  it('returns System for null actor', () => {
    expect(formatActor(null)).toBe('System')
  })
  it('prefers name over email', () => {
    expect(
      formatActor({ id: 'u', name: 'Ava Patel', email: 'ava@x.com', avatarUrl: null }),
    ).toBe('Ava Patel')
  })
  it('falls back to email when name is missing', () => {
    expect(formatActor({ id: 'u', name: null, email: 'ava@x.com', avatarUrl: null })).toBe(
      'ava@x.com',
    )
  })
  it('falls back to a placeholder when both are missing', () => {
    expect(formatActor({ id: 'u', name: null, email: null, avatarUrl: null })).toBe(
      'Unknown user',
    )
  })
})
