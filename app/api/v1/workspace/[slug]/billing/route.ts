import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { PLAN_LIMITS } from '@/lib/utils/constants'

type PlanSlug = keyof typeof PLAN_LIMITS

// GET /api/v1/workspace/[slug]/billing
// Returns the full billing + usage snapshot that powers the Billing &
// Subscription page. One request, authoritative data from the DB — no
// hardcoded placeholder plan, no static invoice list. If the webhook
// has fired, you'll see it here.
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  if (!hasValidDatabaseUrl) {
    // Dev fallback: placeholder plan so the page renders end-to-end
    // without Supabase env vars.
    return NextResponse.json({
      data: {
        plan: 'free' as const,
        trial_ends_at: null,
        gr_subscription_id: null,
        gr_subscription_manage_url: null,
        gr_customer_email: null,
        daysUntilTrialEnd: null,
        usage: {
          members: { count: 1, limit: PLAN_LIMITS.free.members },
          nodes: { count: 0, limit: PLAN_LIMITS.free.nodes },
          workflows: { count: 0, limit: PLAN_LIMITS.free.workflows },
        },
      },
      error: null,
    })
  }

  // 1. Resolve workspace by slug
  const { data: workspace, error: wsErr } = await db
    .from('workspaces')
    .select('id, plan, trial_ends_at, gr_customer_email, gr_subscription_id, gr_subscription_manage_url')
    .eq('slug', params.slug)
    .maybeSingle()

  if (wsErr) {
    return NextResponse.json({ error: wsErr.message }, { status: 500 })
  }
  if (!workspace) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  // 2. Membership check — only workspace members can see billing
  const { data: membership } = await db
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  // 3. Usage counts — parallel, all scoped to this workspace
  const [membersRes, nodesRes, workflowsRes] = await Promise.all([
    db.from('workspace_members').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
    db.from('nodes').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
    db.from('workflows').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
  ])

  const plan = (workspace.plan as PlanSlug) ?? 'free'
  const limits = PLAN_LIMITS[plan]

  // 4. Trial countdown — null if no trial or already expired
  let daysUntilTrialEnd: number | null = null
  if (workspace.trial_ends_at) {
    const endMs = new Date(workspace.trial_ends_at).getTime()
    const diffDays = Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24))
    daysUntilTrialEnd = diffDays > 0 ? diffDays : 0
  }

  return NextResponse.json({
    data: {
      plan,
      trial_ends_at: workspace.trial_ends_at,
      gr_subscription_id: workspace.gr_subscription_id,
      gr_subscription_manage_url: workspace.gr_subscription_manage_url,
      gr_customer_email: workspace.gr_customer_email,
      daysUntilTrialEnd,
      usage: {
        members: { count: membersRes.count ?? 0, limit: limits.members },
        nodes: { count: nodesRes.count ?? 0, limit: limits.nodes },
        workflows: { count: workflowsRes.count ?? 0, limit: limits.workflows },
      },
    },
    error: null,
  })
}
