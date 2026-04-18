// ─── Workspace Maturity Score (WMS) ─────────────────────────────────
// Internal, invisible-to-user score that drives progressive feature exposure.
// Every meaningful action bumps WMS. Sidebar navigation, command palette, and
// onboarding modals read the score to decide what to show.
// ─────────────────────────────────────────────────────────────────────

import { db, hasValidDatabaseUrl } from '@/lib/db/client'

export type WmsEvent =
  | 'decision_created'
  | 'outcome_recorded'
  | 'teammate_invited'
  | 'decision_public_shared'
  | 'integration_connected'

const EVENT_WEIGHTS: Record<WmsEvent, number> = {
  decision_created: 2,
  outcome_recorded: 3,
  teammate_invited: 5,
  decision_public_shared: 2,
  integration_connected: 4,
}

export const WMS_THRESHOLDS = {
  L1_ENTRY: 0,
  L2_ACTIVATION: 15,
  L3_EXPANSION: 35,
  L4_POWER: 60,
} as const

export type WmsLayer = 1 | 2 | 3 | 4

export function layerForScore(score: number): WmsLayer {
  if (score >= WMS_THRESHOLDS.L4_POWER) return 4
  if (score >= WMS_THRESHOLDS.L3_EXPANSION) return 3
  if (score >= WMS_THRESHOLDS.L2_ACTIVATION) return 2
  return 1
}

export function isFeatureUnlocked(
  feature: 'tasks' | 'threads' | 'docs' | 'tables' | 'canvas' | 'automations' | 'integrations',
  score: number,
  powerUserOverride = false
): boolean {
  if (powerUserOverride) return true
  const layer = layerForScore(score)
  switch (feature) {
    case 'tasks':
    case 'threads':
      return layer >= 2
    case 'docs':
    case 'tables':
      return layer >= 3
    case 'canvas':
    case 'automations':
    case 'integrations':
      return layer >= 4
    default:
      return true
  }
}

export async function incrementWmsFor(workspaceId: string, event: WmsEvent): Promise<number | null> {
  if (!hasValidDatabaseUrl) return null
  const delta = EVENT_WEIGHTS[event] ?? 1

  const { data: current } = await db
    .from('workspaces')
    .select('wms_score')
    .eq('id', workspaceId)
    .maybeSingle()

  const previous = typeof current?.wms_score === 'number' ? current.wms_score : 0
  const next = Math.max(0, Math.min(100, previous + delta))

  const { error } = await db
    .from('workspaces')
    .update({ wms_score: next, wms_updated_at: new Date().toISOString() })
    .eq('id', workspaceId)

  return error ? null : next
}
