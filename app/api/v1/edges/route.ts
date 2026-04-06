import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'
import { edges } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  workflowId: z.string().uuid(),
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  condition: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  const url = new URL(req.url)
  const workflowId = url.searchParams.get('workflowId')
  if (!workflowId) return NextResponse.json({ error: 'MISSING_WORKFLOW_ID' }, { status: 400 })

  const results = await db.select().from(edges).where(eq(edges.workflowId, workflowId))
  return NextResponse.json({ data: results, error: null })
}

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const [edge] = await db.insert(edges).values(parsed.data).returning()
  return NextResponse.json({ data: edge, error: null }, { status: 201 })
}

export async function DELETE(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  if (!hasValidDatabaseUrl) return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED', message: 'Set DATABASE_URL in .env.local to connect to a Neon PostgreSQL database.' }, { status: 503 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'MISSING_ID' }, { status: 400 })

  await db.delete(edges).where(eq(edges.id, id))
  return NextResponse.json({ data: { deleted: true }, error: null })
}
