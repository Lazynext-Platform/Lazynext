import { safeAuth } from '@/lib/utils/auth'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import Stripe from 'stripe'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { workspaces } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const portalSchema = z.object({
  workspaceId: z.string().uuid(),
})

export async function POST(req: Request) {
  const { userId } = await safeAuth()
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = portalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { workspaceId } = parsed.data

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'STRIPE_NOT_CONFIGURED', message: 'Set STRIPE_SECRET_KEY env var to enable billing portal.' },
      { status: 503 }
    )
  }

  if (!hasValidDatabaseUrl) {
    return NextResponse.json({ error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 })
  }

  try {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
    if (!workspace?.stripeCustomerId) {
      return NextResponse.json({ error: 'NO_STRIPE_CUSTOMER', message: 'Workspace has no Stripe customer.' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' })
    const session = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${appUrl}/workspace/${workspaceId}/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe portal error:', err)
    return NextResponse.json({ error: 'STRIPE_ERROR', message: 'Failed to create portal session.' }, { status: 500 })
  }
}
