// ─── Template catalog ──────────────────────────────────────────────
// Curated starter templates. Each entry is a self-contained workflow
// with seed nodes + edges that the install endpoint clones into the
// caller's workspace. Stored as code (not DB rows) so:
//   - templates ship with the deploy, no seed migration needed
//   - we can iterate on copy/structure via PR review
//   - no cross-workspace RLS gymnastics for "public templates"

export type TemplateNodeType = 'task' | 'doc' | 'decision' | 'thread' | 'pulse' | 'automation' | 'table'

export interface TemplateNodeSeed {
  /** Local id used to wire edges; never persisted. */
  id: string
  type: TemplateNodeType
  title: string
  position: { x: number; y: number }
  data?: Record<string, unknown>
  status?: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'
}

export interface TemplateEdgeSeed {
  source: string
  target: string
}

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  category: 'engineering' | 'product' | 'agency' | 'operations' | 'startup'
  icon: string // lucide icon name
  color: string // tailwind color name (text-{color}-400)
  nodes: TemplateNodeSeed[]
  edges: TemplateEdgeSeed[]
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateDefinition['category'], string> = {
  engineering: 'Engineering',
  product: 'Product',
  agency: 'Agency',
  operations: 'Operations',
  startup: 'Startup',
}

export const TEMPLATE_CATALOG: TemplateDefinition[] = [
  {
    id: 'product-sprint',
    name: 'Product Sprint',
    description: '2-week sprint with planning decision, scoped tasks, and a retro thread.',
    category: 'engineering',
    icon: 'Rocket',
    color: 'blue',
    nodes: [
      { id: 'd1', type: 'decision', title: 'What ships this sprint?', position: { x: 0, y: 0 } },
      { id: 't1', type: 'task', title: 'Scope user stories', position: { x: 280, y: -100 }, status: 'todo' },
      { id: 't2', type: 'task', title: 'Build feature increment', position: { x: 280, y: 0 }, status: 'todo' },
      { id: 't3', type: 'task', title: 'Ship + verify', position: { x: 280, y: 100 }, status: 'todo' },
      { id: 'th1', type: 'thread', title: 'Sprint retro', position: { x: 560, y: 0 } },
    ],
    edges: [
      { source: 'd1', target: 't1' },
      { source: 'd1', target: 't2' },
      { source: 'd1', target: 't3' },
      { source: 't3', target: 'th1' },
    ],
  },
  {
    id: 'architecture-decision-log',
    name: 'Architecture Decision Log',
    description: 'A structured log of architectural decisions with rationale and review threads.',
    category: 'engineering',
    icon: 'GitBranch',
    color: 'purple',
    nodes: [
      { id: 'd1', type: 'decision', title: 'ADR-001: Authentication strategy', position: { x: 0, y: 0 } },
      { id: 'th1', type: 'thread', title: 'Discussion', position: { x: 280, y: -80 } },
      { id: 'doc1', type: 'doc', title: 'Implementation notes', position: { x: 280, y: 80 } },
    ],
    edges: [
      { source: 'd1', target: 'th1' },
      { source: 'd1', target: 'doc1' },
    ],
  },
  {
    id: 'feature-decision-log',
    name: 'Feature Decision Log',
    description: 'Capture the why behind every feature shipped — not just what changed.',
    category: 'product',
    icon: 'Sparkles',
    color: 'emerald',
    nodes: [
      { id: 'd1', type: 'decision', title: 'Why are we building this?', position: { x: 0, y: 0 } },
      { id: 'doc1', type: 'doc', title: 'PRD', position: { x: 280, y: -80 } },
      { id: 't1', type: 'task', title: 'Design spec', position: { x: 280, y: 80 }, status: 'todo' },
      { id: 'p1', type: 'pulse', title: 'Track adoption', position: { x: 560, y: 0 } },
    ],
    edges: [
      { source: 'd1', target: 'doc1' },
      { source: 'd1', target: 't1' },
      { source: 't1', target: 'p1' },
    ],
  },
  {
    id: 'okr-tracker',
    name: 'OKR Tracker',
    description: 'Quarterly objectives with key results and weekly check-in pulses.',
    category: 'operations',
    icon: 'Target',
    color: 'amber',
    nodes: [
      { id: 'doc1', type: 'doc', title: 'Q-Objective: state the goal', position: { x: 0, y: 0 } },
      { id: 't1', type: 'task', title: 'KR 1', position: { x: 280, y: -120 }, status: 'todo' },
      { id: 't2', type: 'task', title: 'KR 2', position: { x: 280, y: 0 }, status: 'todo' },
      { id: 't3', type: 'task', title: 'KR 3', position: { x: 280, y: 120 }, status: 'todo' },
      { id: 'p1', type: 'pulse', title: 'Weekly check-in', position: { x: 560, y: 0 } },
    ],
    edges: [
      { source: 'doc1', target: 't1' },
      { source: 'doc1', target: 't2' },
      { source: 'doc1', target: 't3' },
      { source: 't1', target: 'p1' },
      { source: 't2', target: 'p1' },
      { source: 't3', target: 'p1' },
    ],
  },
  {
    id: 'pre-launch-checklist',
    name: 'Pre-launch Checklist',
    description: 'Everything to verify before flipping the switch on a new product.',
    category: 'startup',
    icon: 'Rocket',
    color: 'pink',
    nodes: [
      { id: 'd1', type: 'decision', title: 'Are we ready to launch?', position: { x: 0, y: 0 } },
      { id: 't1', type: 'task', title: 'Marketing site live', position: { x: 280, y: -160 }, status: 'todo' },
      { id: 't2', type: 'task', title: 'Pricing + billing wired', position: { x: 280, y: -60 }, status: 'todo' },
      { id: 't3', type: 'task', title: 'Onboarding flow tested', position: { x: 280, y: 40 }, status: 'todo' },
      { id: 't4', type: 'task', title: 'Analytics + alerting', position: { x: 280, y: 140 }, status: 'todo' },
      { id: 'th1', type: 'thread', title: 'Launch-day war room', position: { x: 560, y: 0 } },
    ],
    edges: [
      { source: 'd1', target: 't1' },
      { source: 'd1', target: 't2' },
      { source: 'd1', target: 't3' },
      { source: 'd1', target: 't4' },
      { source: 't4', target: 'th1' },
    ],
  },
  {
    id: 'client-project',
    name: 'Client Project',
    description: 'Standard agency engagement: kickoff, deliverables, weekly check-ins, sign-off.',
    category: 'agency',
    icon: 'Briefcase',
    color: 'cyan',
    nodes: [
      { id: 'doc1', type: 'doc', title: 'Statement of work', position: { x: 0, y: 0 } },
      { id: 'th1', type: 'thread', title: 'Kickoff call', position: { x: 280, y: -100 } },
      { id: 't1', type: 'task', title: 'Deliverable 1', position: { x: 280, y: 20 }, status: 'todo' },
      { id: 't2', type: 'task', title: 'Deliverable 2', position: { x: 280, y: 120 }, status: 'todo' },
      { id: 'd1', type: 'decision', title: 'Client sign-off', position: { x: 560, y: 60 } },
    ],
    edges: [
      { source: 'doc1', target: 'th1' },
      { source: 'doc1', target: 't1' },
      { source: 'doc1', target: 't2' },
      { source: 't1', target: 'd1' },
      { source: 't2', target: 'd1' },
    ],
  },
]

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATE_CATALOG.find((t) => t.id === id)
}
