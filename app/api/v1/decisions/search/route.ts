import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { decisions } from '@/lib/db/schema'
import { eq, sql, desc } from 'drizzle-orm'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { query, workspaceId } = await req.json()
  if (!query || !workspaceId) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 })
  }

  const results = await db.select().from(decisions)
    .where(eq(decisions.workspaceId, workspaceId))
    .orderBy(desc(decisions.createdAt))
    .limit(10)

  // Filter client-side for now (full-text search requires raw SQL extension)
  const filtered = results.filter((d) => {
    const searchable = `${d.question} ${d.resolution || ''} ${d.rationale || ''}`.toLowerCase()
    return searchable.includes(query.toLowerCase())
  })

  return NextResponse.json({ data: filtered, error: null })
}
