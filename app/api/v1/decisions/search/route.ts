import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { query, workspaceId } = await req.json()
  if (!query || !workspaceId) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 })
  }

  const { data: results, error } = await db
    .from('decisions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Filter client-side for now (full-text search can use Supabase textSearch later)
  const filtered = (results || []).filter((d: { question: string; resolution: string | null; rationale: string | null }) => {
    const searchable = `${d.question} ${d.resolution || ''} ${d.rationale || ''}`.toLowerCase()
    return searchable.includes(query.toLowerCase())
  })

  return NextResponse.json({ data: filtered, error: null })
}
