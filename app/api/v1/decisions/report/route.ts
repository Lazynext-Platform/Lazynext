import { NextResponse } from 'next/server'
import { requireWorkspaceAuth } from '@/lib/utils/route-auth'
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
 * DNA. Bearer-aware as of #49 — cookie sessions get the auto-print
 * dialog, bearer-key consumers (the SDK, downstream automations) get
 * the same HTML and can pipe it through their own renderer
 * (puppeteer, headless-chrome, weasyprint, etc.) to materialise a
 * PDF.
 *
 * Bearer keys still need the workspace's plan to include `pdf-export`
 * (Team+); plan gating is by workspace, not by caller.
 */
export async function GET(req: Request) {
  const requestId = newRequestId()
  const baseHeaders = headersToObject(buildResponseHeaders({ requestId }))

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId || !UUID_RE.test(workspaceId)) {
    return NextResponse.json(
      { error: 'INVALID_WORKSPACE_ID' },
      { status: 400, headers: baseHeaders },
    )
  }

  const auth = await requireWorkspaceAuth(req, workspaceId)
  if (!auth.ok) {
    for (const [k, v] of Object.entries(baseHeaders)) auth.response.headers.set(k, v)
    return auth.response
  }

  // Same `export` rate-limit bucket as /api/v1/export. Bearer requests
  // bucket by keyId (set in resolveAuth) so a leaked key can't burn a
  // human user's budget.
  const rl = rateLimit(`export:${auth.rateLimitId}`, RATE_LIMITS.export)
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

    // Bearer requests get a non-auto-print HTML — the auto-print
    // <script> only makes sense for a human in a browser tab. Pass the
    // viaApiKey flag through so the renderer can omit it.
    const html = renderDecisionReportHtml(report, { autoPrint: !auth.viaApiKey })
    return new NextResponse(html, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    })
  } catch (err) {
    reportApiError(err, {
      route: '/api/v1/decisions/report',
      method: 'GET',
      requestId,
      userId: auth.userId,
      workspaceId,
    })
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500, headers: baseHeaders },
    )
  }
}
