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
  // Free: hard gates to drive upgrade (members = primary trigger).
  free: { members: 3, workflows: 5, nodes: 100, aiQueries: 20 },
  // Paid tiers: unlimited structure; AI queries per-seat/day is the soft cap.
  starter: { members: -1, workflows: -1, nodes: -1, aiQueries: 100 },
  pro: { members: -1, workflows: -1, nodes: -1, aiQueries: 500 },
  business: { members: -1, workflows: -1, nodes: -1, aiQueries: -1 },
  enterprise: { members: -1, workflows: -1, nodes: -1, aiQueries: -1 },
} as const

// Per-seat monthly USD. Display labels: starter="Team", pro="Business",
// business="Enterprise (contact sales)". Kept as slugs to preserve DB enum.
//
// Team sits at $19 — the blueprint Section 41 sensitivity-analysis sweet
// spot (same MRR as $15 at 500 workspaces, better LTV, still inside
// Drowning-Founder WTP $15-25/seat). Business stays at $30 deliberately:
// blueprint flags $39 as losing the Founder ICP, and $30 is the overlap
// between Founder ceiling ($25) and Ops-PM floor ($30) — one price both
// personas can stomach. Decision Health included at Team so the entry
// tier isn't gutted.
export const PLAN_PRICING_USD = {
  free: 0,
  starter: 19,   // Team
  pro: 30,       // Business
  business: null, // Enterprise — custom / contact sales
  enterprise: null,
} as const

// Annual ≈ 20% off monthly. $19 → $15/seat/mo ($180/yr, 21% save),
// $30 → $24/seat/mo ($288/yr, 20% save). Gumroad products are priced
// as the annual total.
export const PLAN_PRICING_USD_ANNUAL = {
  free: 0,
  starter: 15,   // Team, billed annually (per seat per month) — $180/yr
  pro: 24,       // Business, billed annually — $288/yr
  business: null,
  enterprise: null,
} as const

export const TRIAL_DAYS = 14
// Founding Members lock in launch prices for life. No instant percentage
// discount — the "discount" accrues over time as list prices rise.
export const FOUNDING_MEMBER_CAP = 100

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
