import { NextResponse } from 'next/server'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import {
  rateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/utils/rate-limit'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { hasFeature } from '@/lib/utils/plan-gates'
import { loadDecisionReport } from '@/lib/data/decision-report'
import { renderDecisionReportHtml } from '@/lib/reports/decision-html'
import {
  buildResponseHeaders,
  newRequestId,
  headersToObject,
} from '@/lib/utils/api-headers'
import { reportApiError } from '@/lib/utils/api-sentry'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Plan = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

/**
 * GET /api/v1/decisions/report?workspaceId={uuid}
 *
 * Returns a print-optimized HTML document of the workspace's Decision
 * DNA. Cookie-only at v1 (no bearer scope yet — see
 * docs/features/42-decision-dna-pdf-export/architecture.md).
 *
 * The browser is responsible for "save as PDF" via the print dialog;
 * the response embeds an auto-print script as a UX accelerator.
 */
export async function GET(req: Request) {
  const requestId = newRequestId()
  const baseHeaders = headersToObject(buildResponseHeaders({ requestId }))

  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED' },
      { status: 401, headers: baseHeaders },
    )
  }

  // Same `export` rate-limit bucket as /api/v1/export. Both are read-
  // heavy workspace dumps; sharing the bucket limits exposure to
  // scraping campaigns regardless of which endpoint is hit.
  const rl = rateLimit(`export:${userId}`, RATE_LIMITS.export)
  if (!rl.success) {
    const r = rateLimitResponse({
      resetAt: rl.resetAt,
      limit: rl.limit,
      remaining: rl.remaining,
    })
    for (const [k, v] of Object.entries(baseHeaders)) r.headers.set(k, v)
    return r
  }

  if (!hasValidDatabaseUrl) {
    return NextResponse.json(
      {
        error: 'DATABASE_NOT_CONFIGURED',
        message: 'Set Supabase env vars in .env.local.',
      },
      { status: 503, headers: baseHeaders },
    )
  }

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId || !UUID_RE.test(workspaceId)) {
    return NextResponse.json(
      { error: 'INVALID_WORKSPACE_ID' },
      { status: 400, headers: baseHeaders },
    )
  }

  const isMember = await verifyWorkspaceMember(userId, workspaceId)
  if (!isMember) {
    return NextResponse.json(
      { error: 'FORBIDDEN' },
      { status: 403, headers: baseHeaders },
    )
  }

  try {
    const report = await loadDecisionReport(workspaceId)
    if (!report) {
      return NextResponse.json(
        { error: 'WORKSPACE_NOT_FOUND' },
        { status: 404, headers: baseHeaders },
      )
    }

    if (!hasFeature(report.workspace.plan as Plan, 'pdf-export')) {
      return NextResponse.json(
        {
          error: 'PLAN_LIMIT_REACHED',
          variant: 'pdf-export',
          message:
            'PDF export is available on the Team plan and above. Upgrade to share Decision DNA reports.',
          plan: report.workspace.plan,
        },
        { status: 402, headers: baseHeaders },
      )
    }

    const html = renderDecisionReportHtml(report)
    return new NextResponse(html, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        // Decision data is workspace-private; never cache.
        'Cache-Control': 'no-store',
        // Defense-in-depth: the file contains an inline <script> for
        // auto-print but no third-party JS. Lock the doc down.
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/decisions/report',
      method: 'GET',
      requestId,
      userId,
      workspaceId,
    })
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500, headers: baseHeaders },
    )
  }
}
