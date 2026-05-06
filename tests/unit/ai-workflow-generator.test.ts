import { describe, it, expect, vi, beforeEach } from 'vitest'

// Generator tests. Mock the LLM transport at the module boundary so we
// drive parse, retry, and cap-enforcement paths deterministically. The
// `hasAIKeys` flag is set per-test below so we can toggle the
// AI_NOT_CONFIGURED branch.

vi.mock('@/lib/ai/lazymind', () => ({
  hasAIKeys: true,
  callLazyMind: vi.fn(),
}))

import { callLazyMind, hasAIKeys } from '@/lib/ai/lazymind'
import {
  generateWorkflow,
  enforceCaps,
  WorkflowGenerationError,
} from '@/lib/ai/workflow-generator'

const mockedCall = vi.mocked(callLazyMind)

const VALID = JSON.stringify({
  nodes: [
    { tempId: 'n1', type: 'task', title: 'Scope launch' },
    { tempId: 'n2', type: 'decision', title: 'Pick channel' },
  ],
  edges: [{ source: 'n1', target: 'n2' }],
  rationale: 'Two-step plan.',
})

describe('generateWorkflow', () => {
  beforeEach(() => {
    mockedCall.mockReset()
  })

  it('parses valid JSON on first try', async () => {
    mockedCall.mockResolvedValue({ content: VALID, provider: 'groq' })
    const result = await generateWorkflow({ prompt: 'plan a launch', workspaceId: 'ws' })
    expect(result.nodes).toHaveLength(2)
    expect(result.edges).toHaveLength(1)
    expect(result.provider).toBe('groq')
    expect(result.model).toContain('groq')
  })

  it('strips ```json fences before parsing', async () => {
    mockedCall.mockResolvedValue({ content: '```json\n' + VALID + '\n```', provider: 'groq' })
    const result = await generateWorkflow({ prompt: 'x', workspaceId: 'ws' })
    expect(result.nodes).toHaveLength(2)
  })

  it('truncates >12 nodes to 12 and drops orphan edges', () => {
    const nodes = Array.from({ length: 15 }, (_, i) => ({
      tempId: `n${i + 1}`,
      type: 'task' as const,
      title: `t${i + 1}`,
    }))
    // Edges from n1 to every other node — first 12 are kept, rest reference dropped tempIds.
    const edges = Array.from({ length: 14 }, (_, i) => ({ source: 'n1', target: `n${i + 2}` }))
    const out = enforceCaps({ nodes, edges, rationale: '' })
    expect(out.nodes).toHaveLength(12)
    // Only edges whose target survives the truncation remain.
    expect(out.edges.every((e) => out.nodes.some((n) => n.tempId === e.target))).toBe(true)
  })

  it('truncates >20 edges to 20', () => {
    const nodes = Array.from({ length: 5 }, (_, i) => ({
      tempId: `n${i + 1}`,
      type: 'task' as const,
      title: `t${i + 1}`,
    }))
    const edges = Array.from({ length: 25 }, () => ({ source: 'n1', target: 'n2' }))
    const out = enforceCaps({ nodes, edges, rationale: '' })
    expect(out.edges).toHaveLength(20)
  })

  it('drops edges referencing missing tempIds', () => {
    const out = enforceCaps({
      nodes: [
        { tempId: 'n1', type: 'task', title: 'a' },
        { tempId: 'n2', type: 'task', title: 'b' },
      ],
      edges: [
        { source: 'n1', target: 'n2' },
        { source: 'n1', target: 'n99' }, // dangling target
        { source: 'n42', target: 'n2' }, // dangling source
        { source: 'n1', target: 'n1' }, // self-edge
      ],
      rationale: '',
    })
    expect(out.edges).toEqual([{ source: 'n1', target: 'n2' }])
  })

  it('retries once on invalid JSON, succeeds on retry', async () => {
    mockedCall
      .mockResolvedValueOnce({ content: 'I cannot help with that.', provider: 'groq' })
      .mockResolvedValueOnce({ content: VALID, provider: 'groq' })
    const result = await generateWorkflow({ prompt: 'x', workspaceId: 'ws' })
    expect(mockedCall).toHaveBeenCalledTimes(2)
    expect(result.nodes).toHaveLength(2)
  })

  it('throws SCHEMA_INVALID after two parse failures', async () => {
    mockedCall.mockResolvedValue({ content: 'still not json', provider: 'groq' })
    await expect(generateWorkflow({ prompt: 'x', workspaceId: 'ws' })).rejects.toMatchObject({
      name: 'WorkflowGenerationError',
      code: 'SCHEMA_INVALID',
    })
    expect(mockedCall).toHaveBeenCalledTimes(2)
  })

  it('throws AI_CALL_FAILED when LLM throws', async () => {
    mockedCall.mockRejectedValue(new Error('upstream 503'))
    await expect(generateWorkflow({ prompt: 'x', workspaceId: 'ws' })).rejects.toMatchObject({
      name: 'WorkflowGenerationError',
      code: 'AI_CALL_FAILED',
    })
  })

  it('throws AI_NOT_CONFIGURED when hasAIKeys is false', async () => {
    // hasAIKeys is mocked at module init, override per-test via vi.doMock + reset.
    vi.resetModules()
    vi.doMock('@/lib/ai/lazymind', () => ({
      hasAIKeys: false,
      callLazyMind: vi.fn(),
    }))
    const { generateWorkflow: gen, WorkflowGenerationError: Err } = await import(
      '@/lib/ai/workflow-generator'
    )
    await expect(gen({ prompt: 'x', workspaceId: 'ws' })).rejects.toBeInstanceOf(Err)
    await expect(gen({ prompt: 'x', workspaceId: 'ws' })).rejects.toMatchObject({
      code: 'AI_NOT_CONFIGURED',
    })
    vi.doUnmock('@/lib/ai/lazymind')
    vi.resetModules()
  })
})

// Sanity: hasAIKeys mock is wired correctly so the rest of the suite can run.
describe('module wiring', () => {
  it('hasAIKeys resolves to true under default mock', () => {
    expect(hasAIKeys).toBe(true)
  })
  it('exports WorkflowGenerationError class', () => {
    const e = new WorkflowGenerationError('AI_CALL_FAILED', 'x')
    expect(e).toBeInstanceOf(Error)
    expect(e.code).toBe('AI_CALL_FAILED')
  })
})
