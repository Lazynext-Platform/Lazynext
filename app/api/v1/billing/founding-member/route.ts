import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { FOUNDING_MEMBER_CAP } from '@/lib/utils/constants'

// Cache for 5 minutes — this count doesn't need to be real-time and we
// don't want the public pricing page pounding the DB on every view.
export const revalidate = 300

/**
 * Public endpoint — returns how many Founding Member spots are left.
 *
 * Logic: the first N distinct workspaces that ever had a non-free plan
 * (`gr_subscription_id` set for the first time) are the Founding Members.
 * When the count of such workspaces hits `FOUNDING_MEMBER_CAP`, the
 * promotion is closed.
 */
export async function GET() {
  if (!hasValidDatabaseUrl) {
    return NextResponse.json({
      cap: FOUNDING_MEMBER_CAP,
      claimed: 0,
      remaining: FOUNDING_MEMBER_CAP,
      open: true,
    })
  }

  const { count } = await db
    .from('workspaces')
    .select('*', { count: 'exact', head: true })
    .not('gr_subscription_id', 'is', null)

  const claimed = Math.min(count ?? 0, FOUNDING_MEMBER_CAP)
  const remaining = Math.max(FOUNDING_MEMBER_CAP - claimed, 0)

  return NextResponse.json({
    cap: FOUNDING_MEMBER_CAP,
    claimed,
    remaining,
    open: remaining > 0,
  })
}
