// ─── Supabase Database Schema ─────────────────────────────────
// This file documents the database schema for Supabase.
// The actual tables are created in Supabase using SQL migrations.
// Use `npx supabase gen types typescript` to generate TypeScript types.

// ─── Table Names ─────────────────────────────────────────────
export const TABLES = {
  workspaces: 'workspaces',
  workspaceMembers: 'workspace_members',
  workflows: 'workflows',
  nodes: 'nodes',
  edges: 'edges',
  threads: 'threads',
  messages: 'messages',
  decisions: 'decisions',
  automationRuns: 'automation_runs',
} as const

// ─── Enum Values ─────────────────────────────────────────────
export const PLAN_VALUES = ['free', 'starter', 'pro', 'business', 'enterprise'] as const
export const ROLE_VALUES = ['admin', 'member', 'guest'] as const
export const NODE_TYPE_VALUES = ['task', 'doc', 'table', 'thread', 'decision', 'automation', 'pulse'] as const
export const STATUS_VALUES = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled'] as const
export const DECISION_STATUS_VALUES = ['open', 'decided', 'reversed', 'deferred'] as const
export const DECISION_TYPE_VALUES = ['reversible', 'irreversible', 'experimental'] as const
export const OUTCOME_VALUES = ['good', 'bad', 'neutral', 'pending'] as const

// ─── TypeScript Types (matching Supabase tables) ─────────────
export type Workspace = {
  id: string
  name: string
  slug: string
  logo: string | null
  plan: typeof PLAN_VALUES[number]
  trial_ends_at: string | null
  ls_customer_id: string | null
  ls_subscription_id: string | null
  ls_customer_portal_url: string | null
  region: string | null
  wms_score: number
  wms_updated_at: string
  power_user_override: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type WorkspaceMember = {
  id: string
  workspace_id: string
  user_id: string
  role: typeof ROLE_VALUES[number]
  joined_at: string
}

export type Workflow = {
  id: string
  workspace_id: string
  name: string
  description: string | null
  is_template: boolean
  is_public: boolean
  template_category: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type Node = {
  id: string
  workflow_id: string
  workspace_id: string
  type: typeof NODE_TYPE_VALUES[number]
  title: string
  data: Record<string, unknown>
  position_x: number
  position_y: number
  status: typeof STATUS_VALUES[number] | null
  assigned_to: string | null
  due_at: string | null
  decision_id: string | null
  operational_reason: string | null
  created_by: string
  created_at: string
  updated_at: string
  updated_by: string | null
}

export type Edge = {
  id: string
  workflow_id: string
  source_id: string
  target_id: string
  condition: Record<string, unknown> | null
  created_at: string
}

export type Thread = {
  id: string
  node_id: string
  workspace_id: string
  title: string | null
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_by: string
  created_at: string
}

export type Message = {
  id: string
  thread_id: string
  content: string
  content_type: string
  attachments: unknown[]
  created_by: string
  created_at: string
  edited_at: string | null
}

export type Decision = {
  id: string
  workspace_id: string
  node_id: string | null
  question: string
  resolution: string | null
  rationale: string | null
  status: typeof DECISION_STATUS_VALUES[number]
  options_considered: string[]
  information_at_time: Record<string, unknown> | null
  stakeholders: string[]
  decision_type: typeof DECISION_TYPE_VALUES[number] | null
  outcome: typeof OUTCOME_VALUES[number]
  outcome_tagged_by: string | null
  outcome_tagged_at: string | null
  outcome_notes: string | null
  outcome_confidence: number | null
  quality_score: number | null
  quality_feedback: string | null
  quality_scored_at: string | null
  score_breakdown: DecisionScoreBreakdown | null
  score_model_version: string | null
  score_rationale: string | null
  expected_by: string | null
  is_public: boolean
  public_slug: string | null
  outcome_reminder_sent_at: string | null
  tags: string[]
  made_by: string
  created_at: string
  updated_at: string
}

export type DecisionScoreBreakdown = {
  clarity: number
  data_quality: number
  risk_awareness: number
  alternatives_considered: number
}

export type AutomationRun = {
  id: string
  node_id: string
  workspace_id: string
  status: string
  result: Record<string, unknown> | null
  error: string | null
  started_at: string
  completed_at: string | null
}
