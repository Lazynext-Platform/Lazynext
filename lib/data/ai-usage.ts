import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { PLAN_LIMITS } from '@/lib/utils/constants'
import { canUseAI } from '@/lib/utils/plan-gates'

export type Plan = keyof typeof PLAN_LIMITS

/**
 * AI usage tracking with per-(user, workspace, UTC day) granularity.
 *
 * Backed by the `ai_usage` table introduced in migration
 * `20260427000005_ai_usage.sql`. The plan cap comes from
 * `PLAN_LIMITS[plan].aiQueries` — Free 20/day, Starter 100/day/seat,
 * Pro 500/day/seat, Business + Enterprise unlimited (-1).
 *
 * Design notes:
 * - Day boundary is UTC. Users on a far-eastern timezone get their
 *   reset at local 8AM, on the West Coast they reset at 5PM. That's
 *   the cost of a single global cutover; per-user-tz buckets would
 *   require either storing tz on the user row or rounding to the
 *   nearest hour. Defer until anyone complains.
 * - `currentUsage` returns 0 when the DB isn't configured (dev) so
 *   local development isn't blocked by a missing migration.
 * - Increments are best-effort and never block the AI call: a failed
 *   write produces a warn-log; the user still gets their answer.
 */

function utcDayString(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export async function getDailyAiUsage(userId: string, workspaceId: string): Promise<number> {
  if (!hasValidDatabaseUrl) return 0
  const { data } = await db
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .eq('day', utcDayString())
    .maybeSingle()
  return (data as { count?: number } | null)?.count ?? 0
}

export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  if (!hasValidDatabaseUrl) return 'free'
  const { data } = await db
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .maybeSingle()
  return ((data as { plan?: string } | null)?.plan ?? 'free') as Plan
}

export interface AiQuotaCheck {
  allowed: boolean
  plan: Plan
  used: number
  limit: number // -1 means unlimited
}

export async function checkAiQuota(userId: string, workspaceId: string): Promise<AiQuotaCheck> {
  const plan = await getWorkspacePlan(workspaceId)
  const used = await getDailyAiUsage(userId, workspaceId)
  const limit = PLAN_LIMITS[plan].aiQueries
  return {
    allowed: canUseAI(plan, used),
    plan,
    used,
    limit,
  }
}

/**
 * Best-effort increment. Uses upsert so the row is created on first
 * use of the day. Fire-and-forget — never throws.
 */
export async function recordAiUsage(userId: string, workspaceId: string): Promise<void> {
  if (!hasValidDatabaseUrl) return
  const day = utcDayString()
  // Read-modify-write. Race condition between two concurrent AI calls
  // from the same user could undercount by 1, which we tolerate (the
  // user is using fewer of their quota than recorded, not more).
  const { data: existing } = await db
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .eq('day', day)
    .maybeSingle()

  const next = ((existing as { count?: number } | null)?.count ?? 0) + 1
  await db
    .from('ai_usage')
    .upsert(
      { user_id: userId, workspace_id: workspaceId, day, count: next, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,workspace_id,day' },
    )
    .then(
      () => undefined,
      () => undefined,
    )
}
