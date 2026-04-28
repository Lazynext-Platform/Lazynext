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

  // Find the signed-in user's existing workspace (from handle_new_user trigger
  // or a previous onboarding run). If none exists — e.g. they signed up before
  // the trigger was live — we backfill a workspace + membership here.
  const { data: membership, error: membershipError } = await db
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    if (process.env.NODE_ENV === 'development') console.error('onboarding/workspace membership lookup:', membershipError)
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
  }

  // Check if the chosen slug is taken by someone else
  const { data: slugOwner, error: slugOwnerError } = await db
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (slugOwnerError) {
    if (process.env.NODE_ENV === 'development') console.error('onboarding/workspace slug lookup:', slugOwnerError)
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
  }

  if (slugOwner && slugOwner.id !== membership?.workspace_id) {
    return NextResponse.json({ error: 'SLUG_TAKEN' }, { status: 409 })
  }

  // Path A: user already has a workspace — rename + reslug it.
  if (membership?.workspace_id) {
    const { data: workspace, error: updateError } = await db
      .from('workspaces')
      .update({ name, slug })
      .eq('id', membership.workspace_id)
      .select('id, slug, name')
      .single()

    if (updateError) {
      if (process.env.NODE_ENV === 'development') console.error('onboarding/workspace update:', updateError)
      return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
    }

    return NextResponse.json({ data: workspace, error: null }, { status: 200 })
  }

  // Path B: backfill — create the workspace and admin membership.
  const { data: workspace, error: insertError } = await db
    .from('workspaces')
    .insert({ name, slug, created_by: userId })
    .select('id, slug, name')
    .single()

  if (insertError) {
    if (process.env.NODE_ENV === 'development') console.error('onboarding/workspace insert:', insertError)
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
  }

  const { error: memberError } = await db
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: userId, role: 'admin' })

  if (memberError) {
    if (process.env.NODE_ENV === 'development') console.error('onboarding/workspace member insert:', memberError)
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
  }

  return NextResponse.json({ data: workspace, error: null }, { status: 201 })
}
