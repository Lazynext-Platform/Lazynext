import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { workflows, workspaceMembers, workspaces } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  workspaceId: z.string().uuid(),
})

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const url = new URL(req.url)
  const workspaceId = url.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'MISSING_WORKSPACE_ID' }, { status: 400 })

  const results = await db.select().from(workflows)
    .where(eq(workflows.workspaceId, workspaceId))
    .orderBy(workflows.updatedAt)

  return NextResponse.json({ data: results, error: null })
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, description, workspaceId } = parsed.data

  const [workflow] = await db.insert(workflows).values({
    workspaceId,
    name,
    description: description || null,
    createdBy: userId,
  }).returning()

  return NextResponse.json({ data: workflow, error: null }, { status: 201 })
}
