import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { decisions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  resolution: z.string().optional(),
  rationale: z.string().optional(),
  status: z.enum(['open', 'decided', 'reversed', 'deferred']).optional(),
  outcome: z.enum(['good', 'bad', 'neutral', 'pending']).optional(),
  outcomeNotes: z.string().optional(),
  outcomeConfidence: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  const decision = await db.query.decisions.findFirst({
    where: eq(decisions.id, params.id),
  })

  if (!decision) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ data: decision, error: null })
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

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  }

  if (parsed.data.outcome && parsed.data.outcome !== 'pending') {
    updateData.outcomeTaggedBy = userId
    updateData.outcomeTaggedAt = new Date()
  }

  const [updated] = await db.update(decisions)
    .set(updateData)
    .where(eq(decisions.id, params.id))
    .returning()

  return NextResponse.json({ data: updated, error: null })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  await db.delete(decisions).where(eq(decisions.id, params.id))
  return NextResponse.json({ data: { deleted: true }, error: null })
}
