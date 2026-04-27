import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { safeAuthUser } from '@/lib/utils/auth'
import { getUserWorkspaces } from '@/lib/data/workspace'
import { parseUserAgent } from '@/lib/utils/user-agent'
import { ProfileClient } from './ProfileClient'

export const dynamic = 'force-dynamic'

function deriveInitials(name: string, email: string): string {
  const trimmed = name.trim()
  if (trimmed.length > 0) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

export default async function ProfilePage({ params }: { params: { slug: string } }) {
  const { user } = await safeAuthUser()
  if (!user) redirect('/sign-in')

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const fullName =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
      ? meta.name
      : ''
  const [firstName, ...rest] = fullName.split(/\s+/)
  const lastName = rest.join(' ')
  const email = user.email ?? ''
  const avatarUrl =
    typeof meta.avatar_url === 'string'
      ? meta.avatar_url
      : typeof meta.picture === 'string'
      ? meta.picture
      : null
  const role = typeof meta.role === 'string' ? meta.role : ''

  // Identity providers come from app_metadata.providers (set by Supabase).
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>
  const providers = Array.isArray(appMeta.providers)
    ? (appMeta.providers as string[])
    : typeof appMeta.provider === 'string'
    ? [appMeta.provider as string]
    : []

  const workspaces = await getUserWorkspaces(user.id)

  // Parse the current request's user-agent to label the active session.
  // Supabase Auth doesn't expose a per-device session list, but we can at
  // least describe the device the user is reading this page on.
  const ua = headers().get('user-agent')
  const currentDevice = parseUserAgent(ua)

  return (
    <ProfileClient
      initial={{
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        fullName,
        email,
        role,
        avatarUrl,
        initials: deriveInitials(fullName, email),
        providers,
        lastSignInAt: user.last_sign_in_at ?? null,
        currentDevice,
      }}
      workspaces={workspaces}
      currentSlug={params.slug}
    />
  )
}
