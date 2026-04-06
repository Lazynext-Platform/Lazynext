import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { workflows } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  const workflow = await db.query.workflows.findFirst({
    where: eq(workflows.id, params.id),
    with: { nodes: true, edges: true },
  })

  if (!workflow) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ data: workflow, error: null })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const [updated] = await db.update(workflows)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(workflows.id, params.id))
    .returning()

  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  await db.delete(workflows).where(eq(workflows.id, params.id))
  return NextResponse.json({ data: { deleted: true }, error: null })
}
