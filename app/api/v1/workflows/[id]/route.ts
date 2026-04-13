import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { data: workflow, error } = await db
    .from('workflows')
    .select('*, nodes(*), edges:edges(*)')
    .eq('id', params.id)
    .single()

  if (error || !workflow) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const authorized = await verifyWorkspaceMember(userId, workflow.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  return NextResponse.json({ data: workflow, error: null })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Verify ownership before update
  const { data: existing } = await db.from('workflows').select('workspace_id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const authorized = await verifyWorkspaceMember(userId, existing.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data: updated, error } = await db
    .from('workflows')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  // Verify ownership before delete
  const { data: existing } = await db.from('workflows').select('workspace_id').eq('id', params.id).single()
  if (!existing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const authorized = await verifyWorkspaceMember(userId, existing.workspace_id)
  if (!authorized) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  await db.from('workflows').delete().eq('id', params.id)
  return NextResponse.json({ data: { deleted: true }, error: null })
}
