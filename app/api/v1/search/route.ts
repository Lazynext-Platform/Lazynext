import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const url = new URL(req.url)
  const q = url.searchParams.get('q')
  const workspaceId = url.searchParams.get('workspaceId')

  if (!q || !workspaceId) {
    return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 })
  }

  const [nodeRes, decisionRes, workflowRes] = await Promise.all([
    db.from('nodes').select('*').eq('workspace_id', workspaceId).ilike('title', `%${q}%`).limit(10),
    db.from('decisions').select('*').eq('workspace_id', workspaceId).ilike('question', `%${q}%`).limit(10),
    db.from('workflows').select('*').eq('workspace_id', workspaceId).ilike('name', `%${q}%`).limit(5),
  ])

  return NextResponse.json({
    data: {
      nodes: nodeRes.data || [],
      decisions: decisionRes.data || [],
      workflows: workflowRes.data || [],
    },
    error: null,
  })
}
