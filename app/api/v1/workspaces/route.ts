import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { PLAN_LIMITS } from '@/lib/utils/constants'
import { canCreateWorkspace } from '@/lib/utils/plan-gates'

// GET /api/v1/workspaces
// Lists every workspace the authenticated user is a member of, with the
// caller's role on each. Powers the sidebar workspace switcher dropdown.
//
// Response shape: { data: Array<{ id, name, slug, plan, logo, role }>, error: null }
export async function GET() {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ data: [], error: null })
  }

  const { data: memberships, error } = await db
    .from('workspace_members')
    .select('role, workspace:workspaces ( id, name, slug, plan, logo )')
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: 'DB_ERROR', message: error.message }, { status: 500 })
  }

  const rows = (memberships ?? [])
    .map((m) => {
      const w = (m as { workspace: unknown }).workspace
      // Supabase returns the joined row as a single object when the FK
      // is a singular relation, but the typed client surfaces it as an
      // array in some configurations. Normalize.
      const ws = Array.isArray(w) ? w[0] : w
      if (!ws || typeof ws !== 'object') return null
      const ref = ws as { id: string; name: string; slug: string; plan: string; logo: string | null }
      return {
        id: ref.id,
        name: ref.name,
        slug: ref.slug,
        plan: ref.plan,
        logo: ref.logo,
        role: (m as { role: 'owner' | 'admin' | 'member' }).role,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    // Stable order: alphabetical by name.
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ data: rows, error: null })
}

// POST /api/v1/workspaces
// Creates an *additional* workspace for the authenticated user (the
// first workspace is created by the `handle_new_user` trigger or
// `/api/v1/onboarding/workspace` backfill). New workspaces start on
// the `free` plan; the `canCreateWorkspace` gate caps Free users at 1
// admin-owned workspace. Users who already own a paid workspace
// bypass the cap (they've paid for the seat-tier already).
const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const limited = await rateLimit(`workspaces:create:${userId}`, RATE_LIMITS.api)
  if (!limited.success) return rateLimitResponse(limited.resetAt)

  if (!hasValidDatabaseUrl) {
    return NextResponse.json(
      { error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' },
      { status: 503 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }
  const { name, slug } = parsed.data

  // Slug uniqueness — check before any plan-gating so the user gets the
  // clearer error first.
  const { data: slugOwner } = await db
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (slugOwner) {
    return NextResponse.json({ error: 'SLUG_TAKEN' }, { status: 409 })
  }

  // Plan gate. Count the caller's admin-role memberships joined with
  // the workspace's plan. Any paid workspace they own bypasses the
  // Free 1-workspace cap; otherwise the count must be < the cap.
  const { data: adminMemberships } = await db
    .from('workspace_members')
    .select('role, workspace:workspaces ( plan )')
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])

  const ownedRows = (adminMemberships ?? []).map((m) => {
    const w = (m as { workspace: unknown }).workspace
    const ws = Array.isArray(w) ? w[0] : w
    return (ws as { plan?: string } | null)?.plan ?? 'free'
  })
  const hasPaidWorkspace = ownedRows.some((p) => p !== 'free')
  if (!hasPaidWorkspace) {
    const ownedCount = ownedRows.length
    if (!canCreateWorkspace('free', ownedCount)) {
      return NextResponse.json(
        {
          error: 'PLAN_LIMIT_REACHED',
          variant: 'workspace-limit',
          message: `Free is one workspace per account. Upgrade to create more.`,
          limit: PLAN_LIMITS.free.workspaces,
        },
        { status: 402 },
      )
    }
  }

  const { data: workspace, error: insertError } = await db
    .from('workspaces')
    .insert({ name, slug, plan: 'free', created_by: userId })
    .select('id, slug, name, plan')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { error: memberError } = await db
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: userId, role: 'admin' })

  if (memberError) {
    // Best-effort cleanup of the just-created workspace so we don't
    // leave an orphan with no admin membership.
    await db.from('workspaces').delete().eq('id', workspace.id)
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ data: workspace, error: null }, { status: 201 })
}
