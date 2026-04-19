import { NextResponse } from 'next/server'
import { z } from 'zod'
import { safeAuth } from '@/lib/utils/auth'
import { db, hasValidDatabaseUrl } from '@/lib/db/client'

const setupWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  if (!hasValidDatabaseUrl) {
    return NextResponse.json(
      { error: 'DATABASE_NOT_CONFIGURED', message: 'Set Supabase env vars in .env.local.' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }

  const parsed = setupWorkspaceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, slug } = parsed.data

  const { data: membership, error: membershipError } = await db
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  if (!membership?.workspace_id) {
    return NextResponse.json({ error: 'WORKSPACE_NOT_FOUND' }, { status: 404 })
  }

  const workspaceId = membership.workspace_id

  const { data: slugOwner, error: slugOwnerError } = await db
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (slugOwnerError) {
    return NextResponse.json({ error: slugOwnerError.message }, { status: 500 })
  }

  if (slugOwner && slugOwner.id !== workspaceId) {
    return NextResponse.json({ error: 'SLUG_TAKEN' }, { status: 409 })
  }

  const { data: workspace, error: updateError } = await db
    .from('workspaces')
    .update({ name, slug })
    .eq('id', workspaceId)
    .select('id, slug, name')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ data: workspace, error: null }, { status: 200 })
}
