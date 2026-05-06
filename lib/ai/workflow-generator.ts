import { z } from 'zod'
import { callLazyMind, hasAIKeys } from './lazymind'
import {
  WORKFLOW_SYSTEM_PROMPT,
  WORKFLOW_RETRY_PROMPT,
  WORKFLOW_MAX_NODES,
  WORKFLOW_MAX_EDGES,
  WORKFLOW_TITLE_MAX,
  WORKFLOW_DESC_MAX,
  WORKFLOW_LABEL_MAX,
  WORKFLOW_RATIONALE_MAX,
} from './workflow-prompt'

// ─────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────

export const NODE_TYPES = [
  'task',
  'doc',
  'decision',
  'thread',
  'pulse',
  'automation',
  'table',
] as const
export type GeneratedNodeType = (typeof NODE_TYPES)[number]

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const
export type GeneratedTaskStatus = (typeof TASK_STATUSES)[number]

export interface GeneratedNode {
  tempId: string
  type: GeneratedNodeType
  title: string
  description?: string
  status?: GeneratedTaskStatus
}

export interface GeneratedEdge {
  source: string
  target: string
  label?: string
}

export interface GeneratedWorkflow {
  nodes: GeneratedNode[]
  edges: GeneratedEdge[]
  rationale: string
  provider: 'groq' | 'together'
  model: string
}

export type WorkflowGenerationErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_CALL_FAILED'
  | 'SCHEMA_INVALID'

export class WorkflowGenerationError extends Error {
  code: WorkflowGenerationErrorCode
  details?: unknown
  constructor(code: WorkflowGenerationErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'WorkflowGenerationError'
    this.code = code
    this.details = details
  }
}

// ─────────────────────────────────────────────────────────────
// zod schema (mirrors architecture.md JSON contract)
// ─────────────────────────────────────────────────────────────

const NodeSchema = z.object({
  tempId: z.string().min(1).max(20),
  type: z.enum(NODE_TYPES),
  title: z.string().min(1).max(WORKFLOW_TITLE_MAX),
  description: z.string().max(WORKFLOW_DESC_MAX).optional(),
  status: z.enum(TASK_STATUSES).optional(),
})

const EdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(WORKFLOW_LABEL_MAX).optional(),
})

const RawSchema = z.object({
  nodes: z.array(NodeSchema).min(1),
  edges: z.array(EdgeSchema),
  rationale: z.string().max(WORKFLOW_RATIONALE_MAX).default(''),
})

// ─────────────────────────────────────────────────────────────
// JSON-extraction helper (LLMs love wrapping JSON in fences)
// Same pattern as lib/ai/decision-scorer.ts; copied rather than
// shared because the two scorers have diverging sanitization needs.
// ─────────────────────────────────────────────────────────────

function extractJson(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  }
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    s = s.slice(first, last + 1)
  }
  return s.trim()
}

// ─────────────────────────────────────────────────────────────
// Cap enforcement: truncate, don't reject. Architecture decision —
// a 13-node graph is still useful, we just trim the tail and drop
// any edges that now reference dropped nodes.
// ─────────────────────────────────────────────────────────────

export function enforceCaps(graph: {
  nodes: GeneratedNode[]
  edges: GeneratedEdge[]
  rationale: string
}): { nodes: GeneratedNode[]; edges: GeneratedEdge[]; rationale: string } {
  const nodes = graph.nodes.slice(0, WORKFLOW_MAX_NODES)
  const validIds = new Set(nodes.map((n) => n.tempId))
  const edges = graph.edges
    .filter((e) => validIds.has(e.source) && validIds.has(e.target) && e.source !== e.target)
    .slice(0, WORKFLOW_MAX_EDGES)
  return { nodes, edges, rationale: graph.rationale }
}

// ─────────────────────────────────────────────────────────────
// Main entrypoint.
// ─────────────────────────────────────────────────────────────

export interface GenerateWorkflowArgs {
  /** End-user prompt (already auth-gated by the caller). */
  prompt: string
  /** For audit-log binding only — not sent to the LLM. */
  workspaceId: string
}

export async function generateWorkflow(
  args: GenerateWorkflowArgs,
): Promise<GeneratedWorkflow> {
  if (!hasAIKeys) {
    throw new WorkflowGenerationError(
      'AI_NOT_CONFIGURED',
      'No GROQ_API_KEY or TOGETHER_API_KEY configured.',
    )
  }

  const userMessage = args.prompt.trim()

  // First attempt
  let aiContent: string
  let provider: 'groq' | 'together'
  try {
    const ai = await callLazyMind(WORKFLOW_SYSTEM_PROMPT, userMessage, 900)
    aiContent = ai.content
    provider = ai.provider
  } catch (err) {
    throw new WorkflowGenerationError(
      'AI_CALL_FAILED',
      err instanceof Error ? err.message : 'LLM call failed',
    )
  }

  let parsed = tryParse(aiContent)
  if (!parsed.ok) {
    // Retry once with a corrective system message — same pattern
    // we use in decision-scorer when the first emit is malformed.
    try {
      const retry = await callLazyMind(
        WORKFLOW_SYSTEM_PROMPT + '\n\n' + WORKFLOW_RETRY_PROMPT,
        userMessage + '\n\nLast output (rejected): ' + aiContent.slice(0, 400),
        900,
      )
      aiContent = retry.content
      provider = retry.provider
    } catch (err) {
      throw new WorkflowGenerationError(
        'AI_CALL_FAILED',
        err instanceof Error ? err.message : 'LLM retry call failed',
      )
    }
    parsed = tryParse(aiContent)
    if (!parsed.ok) {
      throw new WorkflowGenerationError(
        'SCHEMA_INVALID',
        'LLM produced malformed JSON twice in a row.',
        { raw: aiContent.slice(0, 800), issues: parsed.issues },
      )
    }
  }

  const capped = enforceCaps(parsed.value)

  return {
    nodes: capped.nodes,
    edges: capped.edges,
    rationale: capped.rationale,
    provider,
    model: provider === 'groq' ? 'groq:llama-3.3-70b-versatile' : 'together:llama-3.3-70b',
  }
}

type ParseResult =
  | { ok: true; value: { nodes: GeneratedNode[]; edges: GeneratedEdge[]; rationale: string } }
  | { ok: false; issues: unknown }

function tryParse(content: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(extractJson(content))
  } catch {
    return { ok: false, issues: 'JSON.parse threw' }
  }
  const result = RawSchema.safeParse(raw)
  if (!result.success) return { ok: false, issues: result.error.flatten() }
  return { ok: true, value: result.data }
}
