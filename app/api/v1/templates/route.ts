import { NextResponse } from 'next/server'
import { safeAuth } from '@/lib/utils/auth'
import { rateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/utils/rate-limit'
import { TEMPLATE_CATALOG, TEMPLATE_CATEGORY_LABELS } from '@/lib/data/template-catalog'

/**
 * Returns the curated public template catalog. The catalog ships with
 * the deploy (lib/data/template-catalog.ts) so this endpoint never
 * touches the database — it's effectively a static asset behind auth +
 * rate limiting. Categories are returned alongside so the UI can render
 * filter chips without a second source of truth.
 */
export async function GET() {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const rl = rateLimit(`api:${userId}`, RATE_LIMITS.api)
  if (!rl.success) return rateLimitResponse({ resetAt: rl.resetAt, limit: rl.limit, remaining: rl.remaining })

  const summaries = TEMPLATE_CATALOG.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    categoryLabel: TEMPLATE_CATEGORY_LABELS[t.category],
    icon: t.icon,
    color: t.color,
    nodeCount: t.nodes.length,
    edgeCount: t.edges.length,
  }))

  return NextResponse.json({
    data: {
      templates: summaries,
      categories: Object.entries(TEMPLATE_CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
    },
    error: null,
  })
}
