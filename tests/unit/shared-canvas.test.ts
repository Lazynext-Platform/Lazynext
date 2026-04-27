import { describe, it, expect, vi, beforeEach } from 'vitest'

const workflowMaybeSingle = vi.fn<() => Promise<{ data: unknown }>>()
const workspaceMaybeSingle = vi.fn<() => Promise<{ data: unknown }>>()
const nodesQuery = vi.fn<() => Promise<{ data: unknown }>>()
const edgesQuery = vi.fn<() => Promise<{ data: unknown }>>()

const fromMock = vi.fn((table: string) => {
  if (table === 'workflows') {
    return {
      select: () => ({
        eq: () => ({ maybeSingle: workflowMaybeSingle }),
      }),
    }
  }
  if (table === 'workspaces') {
    return {
      select: () => ({
        eq: () => ({ maybeSingle: workspaceMaybeSingle }),
      }),
    }
  }
  if (table === 'nodes') {
    return {
      select: () => ({ eq: () => nodesQuery() }),
    }
  }
  if (table === 'edges') {
    return {
      select: () => ({ eq: () => edgesQuery() }),
    }
  }
  return {}
})

vi.mock('@/lib/db/client', () => ({
  db: { from: fromMock },
  hasValidDatabaseUrl: true,
}))

beforeEach(() => {
  workflowMaybeSingle.mockReset()
  workspaceMaybeSingle.mockReset()
  nodesQuery.mockReset()
  edgesQuery.mockReset()
  fromMock.mockClear()
})

describe('getSharedCanvas', () => {
  it('returns null for a non-UUID token without touching the DB', async () => {
    const { getSharedCanvas } = await import('@/lib/data/shared-canvas')
    const out = await getSharedCanvas('not-a-uuid')
    expect(out).toBeNull()
    expect(workflowMaybeSingle).not.toHaveBeenCalled()
  })

  it('returns null when no workflow matches the token', async () => {
    workflowMaybeSingle.mockResolvedValueOnce({ data: null })
    const { getSharedCanvas } = await import('@/lib/data/shared-canvas')
    const out = await getSharedCanvas('11111111-1111-1111-1111-111111111111')
    expect(out).toBeNull()
  })

  it('hydrates workflow + workspace + nodes + edges on a hit', async () => {
    workflowMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'wf-1',
        name: 'Sprint plan',
        description: 'Q2 plan',
        shared_at: '2026-04-27T00:00:00Z',
        workspace_id: 'ws-1',
      },
    })
    workspaceMaybeSingle.mockResolvedValueOnce({
      data: { name: 'Acme', logo: null },
    })
    nodesQuery.mockResolvedValueOnce({
      data: [
        {
          id: 'n1',
          type: 'task',
          title: 'Ship it',
          data: {},
          position_x: 0,
          position_y: 0,
          status: 'todo',
        },
      ],
    })
    edgesQuery.mockResolvedValueOnce({ data: [] })

    const { getSharedCanvas } = await import('@/lib/data/shared-canvas')
    const out = await getSharedCanvas('11111111-1111-1111-1111-111111111111')
    expect(out).not.toBeNull()
    expect(out?.workflowId).toBe('wf-1')
    expect(out?.name).toBe('Sprint plan')
    expect(out?.workspaceName).toBe('Acme')
    expect(out?.nodes).toHaveLength(1)
    expect(out?.edges).toHaveLength(0)
  })
})
