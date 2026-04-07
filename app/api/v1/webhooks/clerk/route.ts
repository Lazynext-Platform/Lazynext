import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import { workspaces, workspaceMembers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request) {
  const body = await req.json()
  const eventType = body.type

  if (!hasValidDatabaseUrl) {
    console.log(`[clerk-webhook] DB not configured, skipping event: ${eventType}`)
    return NextResponse.json({ received: true })
  }

  try {
    switch (eventType) {
      case 'user.created': {
        const { id: clerkUserId, email_addresses, first_name, last_name } = body.data
        const email = email_addresses?.[0]?.email_address
        const name = [first_name, last_name].filter(Boolean).join(' ') || email || 'User'
        const slug = `workspace-${clerkUserId.slice(-8)}`

        // Create a default workspace for new users
        const [workspace] = await db.insert(workspaces).values({
          name: `${name}'s Workspace`,
          slug,
          clerkOrgId: null,
          createdBy: clerkUserId,
          plan: 'free',
        }).returning()

        if (workspace) {
          await db.insert(workspaceMembers).values({
            workspaceId: workspace.id,
            clerkUserId,
            role: 'admin',
          })
        }
        break
      }

      case 'user.deleted': {
        const { id: clerkUserId } = body.data
        // Remove user from all workspace memberships
        await db.delete(workspaceMembers).where(eq(workspaceMembers.clerkUserId, clerkUserId))
        break
      }

      case 'organization.created': {
        const { id: clerkOrgId, name, slug: orgSlug, created_by } = body.data
        await db.insert(workspaces).values({
          name: name || 'Untitled Workspace',
          slug: orgSlug || `org-${clerkOrgId.slice(-8)}`,
          clerkOrgId,
          createdBy: created_by || 'system',
          plan: 'free',
        })
        break
      }

      case 'organizationMembership.created': {
        const { organization, public_user_data } = body.data
        if (organization?.id && public_user_data?.user_id) {
          const [workspace] = await db.select().from(workspaces).where(eq(workspaces.clerkOrgId, organization.id)).limit(1)
          if (workspace) {
            await db.insert(workspaceMembers).values({
              workspaceId: workspace.id,
              clerkUserId: public_user_data.user_id,
              role: 'member',
            }).onConflictDoNothing()
          }
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Clerk webhook error:', err)
    return NextResponse.json({ error: 'WEBHOOK_PROCESSING_ERROR' }, { status: 500 })
  }
}
