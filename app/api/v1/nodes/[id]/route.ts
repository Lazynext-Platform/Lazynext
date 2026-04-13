import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']).optional(),
  assignedTo: z.string().optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const { data: node, error } = await db
    .from('nodes')
    .select('*, threads(*)')
    .eq('id', params.id)
    .single()

  if (error || !node) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ data: node, error: null })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' }, { status: 503 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { updated_by: userId }
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title
  if (parsed.data.data !== undefined) updateData.data = parsed.data.data
  if (parsed.data.positionX !== undefined) updateData.position_x = parsed.data.positionX
  if (parsed.data.positionY !== undefined) updateData.position_y = parsed.data.positionY
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status
  if (parsed.data.assignedTo !== undefined) updateData.assigned_to = parsed.data.assignedTo

  const { data: updated, error } = await db
    .from('nodes')
    .update(updateData)
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

  await db.from('nodes').delete().eq('id', params.id)
  return NextResponse.json({ data: { deleted: true }, error: null })
}
