import { describe, it, expect, vi, beforeEach } from 'vitest'

// db.from('automations').select(...).eq(...).eq(...).eq(...) → list
// db.from('automation_runs').insert({...}) → write run row

const enabledAutomations: Array<{
  id: string
  workspace_id: string
  trigger_type: string
  action_type: string
  action_config: Record<string, unknown>
}> = []

const insertedRuns: Record<string, unknown>[] = []

const fromMock = vi.fn<(table: string) => unknown>((table: string) => {
  if (table === 'automation_runs') {
    return {
      insert: (payload: Record<string, unknown>) => {
        insertedRuns.push(payload)
        return Promise.resolve({ error: null })
      },
    }
  }
  if (table === 'automations') {
    return {
      select: () => ({
        eq: (_c1: string, _v1: unknown) => ({
          eq: (_c2: string, _v2: unknown) => ({
            eq: (_c3: string, _v3: unknown) =>
              Promise.resolve({ data: enabledAutomations, error: null }),
          }),
        }),
      }),
    }
  }
  return {
    insert: () => Promise.resolve({ error: null }),
    select: () => ({ eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }) }),
  }
})

vi.mock('@/lib/db/client', () => ({
  db: { from: fromMock },
  hasValidDatabaseUrl: true,
}))

const notifyMock = vi.fn<(args: Record<string, unknown>) => Promise<boolean>>(() => Promise.resolve(true))
vi.mock('@/lib/data/notifications', () => ({
  notifyWorkspaceMembers: notifyMock,
}))

beforeEach(() => {
  enabledAutomations.length = 0
  insertedRuns.length = 0
  notifyMock.mockClear()
  fromMock.mockClear()
})

describe('runAutomations', () => {
  it('runs nothing when no automations match the trigger', async () => {
    const { runAutomations } = await import('@/lib/data/automations')
    await runAutomations({
      type: 'decision.logged',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      actorId: 'user-a',
      decisionId: 'd1',
      question: 'q',
      decisionType: null,
      qualityScore: 80,
      workspaceSlug: 'demo',
    })
    expect(notifyMock).not.toHaveBeenCalled()
    expect(insertedRuns).toHaveLength(0)
  })

  it('fires notification.send action with interpolated title/body and writes a success run', async () => {
    enabledAutomations.push({
      id: 'auto-1',
      workspace_id: '00000000-0000-0000-0000-000000000001',
      trigger_type: 'decision.logged',
      action_type: 'notification.send',
      action_config: {
        title: 'Decision: {{question}}',
        body: 'Score {{qualityScore}}',
      },
    })
    const { runAutomations } = await import('@/lib/data/automations')
    await runAutomations({
      type: 'decision.logged',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      actorId: 'user-a',
      decisionId: 'd1',
      question: 'Should we ship?',
      decisionType: 'reversible',
      qualityScore: 88,
      workspaceSlug: 'demo',
    })
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.title).toBe('Decision: Should we ship?')
    expect(call.body).toBe('Score 88')
    expect(call.link).toBe('/workspace/demo/decisions/d1')
    expect(insertedRuns).toHaveLength(1)
    expect(insertedRuns[0].status).toBe('success')
    expect(insertedRuns[0].automation_id).toBe('auto-1')
  })

  it('records a failed run when webhook URL is not https', async () => {
    enabledAutomations.push({
      id: 'auto-2',
      workspace_id: '00000000-0000-0000-0000-000000000001',
      trigger_type: 'task.created',
      action_type: 'webhook.post',
      action_config: { url: 'http://insecure.example.com' },
    })
    const { runAutomations } = await import('@/lib/data/automations')
    await runAutomations({
      type: 'task.created',
      workspaceId: '00000000-0000-0000-0000-000000000001',
      actorId: 'user-a',
      nodeId: 'n1',
      title: 'Ship it',
      assignedTo: null,
      workspaceSlug: 'demo',
    })
    expect(insertedRuns).toHaveLength(1)
    expect(insertedRuns[0].status).toBe('failed')
    expect(insertedRuns[0].error).toMatch(/https/)
  })

  it('does not throw if Supabase select returns an error', async () => {
    const { runAutomations } = await import('@/lib/data/automations')
    fromMock.mockImplementationOnce(
      () =>
        ({
          select: () => ({
            eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'boom' } }) }) }),
          }),
        }) as unknown as ReturnType<typeof fromMock>,
    )
    await expect(
      runAutomations({
        type: 'task.created',
        workspaceId: '00000000-0000-0000-0000-000000000001',
        actorId: null,
        nodeId: 'n1',
        title: 't',
        assignedTo: null,
        workspaceSlug: null,
      }),
    ).resolves.toBeUndefined()
  })
})
