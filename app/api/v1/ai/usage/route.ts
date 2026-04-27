import { NextResponse } from 'next/server'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { checkAiQuota } from '@/lib/data/ai-usage'

// GET /api/v1/ai/usage?workspaceId=…
//
// Returns the caller's AI-query usage for today in the given workspace,
// plus the workspace's plan-derived daily limit. Powers the badge in
// the LazyMind panel header so the count survives page reloads
// (without this the badge always read `0/20` on every fresh load and
// users had no idea how much quota they had left).
//
// Response: { data: { plan, used, limit, remaining }, error: null }
// `limit: -1` means unlimited.
export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'WORKSPACE_ID_REQUIRED' }, { status: 400 })
  }

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({
      data: { plan: 'free', used: 0, limit: 20, remaining: 20 },
      error: null,
    })
  }

  const ok = await verifyWorkspaceMember(userId, workspaceId)
  if (!ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const quota = await checkAiQuota(userId, workspaceId)
  return NextResponse.json({
    data: {
      plan: quota.plan,
      used: quota.used,
      limit: quota.limit,
      remaining: quota.limit === -1 ? -1 : Math.max(0, quota.limit - quota.used),
    },
    error: null,
  })
}
