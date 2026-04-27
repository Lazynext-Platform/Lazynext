// ─── Public shared canvas data fetch ────────────────────────────────
// Reads a workflow + its nodes + edges by share_token via the
// service-role admin client. The token doubles as authorization, so
// this helper is the single chokepoint between an anonymous request
// and workspace data — no broad anon RLS policy needed.

import { db, hasValidDatabaseUrl } from '@/lib/db/client'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SharedCanvasNode {
  id: string
  type: string
  title: string
  data: Record<string, unknown>
  position_x: number
  position_y: number
  status: string | null
}

export interface SharedCanvasEdge {
  id: string
  source_id: string
  target_id: string
}

export interface SharedCanvasView {
  workflowId: string
  workspaceName: string | null
  workspaceLogo: string | null
  name: string
  description: string | null
  sharedAt: string | null
  nodes: SharedCanvasNode[]
  edges: SharedCanvasEdge[]
}

export async function getSharedCanvas(token: string): Promise<SharedCanvasView | null> {
  if (!hasValidDatabaseUrl) return null
  if (!UUID_RE.test(token)) return null

  const { data: workflow } = await db
    .from('workflows')
    .select('id, name, description, shared_at, workspace_id')
    .eq('share_token', token)
    .maybeSingle()
  if (!workflow) return null
  const wf = workflow as {
    id: string
    name: string
    description: string | null
    shared_at: string | null
    workspace_id: string
  }

  const [{ data: ws }, { data: nodes }, { data: edges }] = await Promise.all([
    db.from('workspaces').select('name, logo').eq('id', wf.workspace_id).maybeSingle(),
    db.from('nodes').select('id, type, title, data, position_x, position_y, status').eq('workflow_id', wf.id),
    db.from('edges').select('id, source_id, target_id').eq('workflow_id', wf.id),
  ])

  const workspace = (ws ?? null) as { name: string; logo: string | null } | null
  return {
    workflowId: wf.id,
    workspaceName: workspace?.name ?? null,
    workspaceLogo: workspace?.logo ?? null,
    name: wf.name,
    description: wf.description,
    sharedAt: wf.shared_at,
    nodes: (nodes ?? []) as SharedCanvasNode[],
    edges: (edges ?? []) as SharedCanvasEdge[],
  }
}
