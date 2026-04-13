export const NODE_TYPES = {
  task: { label: 'Task', color: 'blue', icon: 'CheckSquare' },
  doc: { label: 'Doc', color: 'emerald', icon: 'FileText' },
  decision: { label: 'Decision', color: 'orange', icon: 'GitBranch' },
  thread: { label: 'Thread', color: 'purple', icon: 'MessageCircle' },
  pulse: { label: 'Pulse', color: 'cyan', icon: 'Activity' },
  automation: { label: 'Automation', color: 'amber', icon: 'Zap' },
  table: { label: 'Table', color: 'teal', icon: 'Table' },
} as const

export type NodeType = keyof typeof NODE_TYPES

export const PLAN_LIMITS = {
  free: { members: 3, workflows: 5, nodes: 100, aiQueries: 20 },
  starter: { members: 10, workflows: 25, nodes: 1000, aiQueries: 100 },
  pro: { members: 25, workflows: 100, nodes: 10000, aiQueries: 500 },
  business: { members: 100, workflows: -1, nodes: -1, aiQueries: -1 },
  enterprise: { members: -1, workflows: -1, nodes: -1, aiQueries: -1 },
} as const

export const PLAN_PRICING_USD = {
  free: 0,
  starter: 9,
  pro: 19,
  business: 49,
  enterprise: null, // custom
} as const

export const QUALITY_THRESHOLDS = {
  high: 70,
  medium: 40,
} as const

export const NODE_COLORS = {
  task: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500', label: 'text-blue-400' },
  doc: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500', label: 'text-emerald-400' },
  decision: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', dot: 'bg-orange-500', label: 'text-orange-400' },
  thread: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-500', label: 'text-purple-400' },
  pulse: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', dot: 'bg-cyan-500', label: 'text-cyan-400' },
  automation: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500', label: 'text-amber-400' },
  table: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', dot: 'bg-teal-500', label: 'text-teal-400' },
} as const
