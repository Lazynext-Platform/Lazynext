import { redirect, notFound } from 'next/navigation'
import { Plug, CheckCircle2 } from 'lucide-react'
import { safeAuth, verifyWorkspaceMember } from '@/lib/utils/auth'
import { getWorkspaceBySlug } from '@/lib/data/workspace'
import { listOAuthConnections } from '@/lib/data/oauth-connections'
import { hasValidDatabaseUrl } from '@/lib/db/client'
import {
  KNOWN_PROVIDER_IDS,
  isProviderConfigured,
  type OAuthProviderId,
} from '@/lib/oauth/registry'
import { cn } from '@/lib/utils/cn'
import { ConnectionTile } from '@/components/ui/ConnectionTile'
import { ApiKeysPanel } from '@/components/ui/ApiKeysPanel'
import { OAuthStatusBanner } from '@/components/ui/OAuthStatusBanner'

// Plan slugs that unlock API keys. Mirrors `lib/utils/plan-gates.ts`'s
// `'api-keys'` entry. Kept inline so the client component never
// has to import server-only code.
const API_KEYS_UNLOCKED_PLANS = ['business', 'enterprise'] as const

export const dynamic = 'force-dynamic'

// Display copy for each roadmap provider. Source of truth for the
// icon + colour in the Integrations UI. Adding a provider in
// `lib/oauth/registry.ts`'s `KNOWN_PROVIDER_IDS` REQUIRES adding a
// row here — the `Record<OAuthProviderId, ...>` type makes that a
// compile error rather than a missing tile.
const PROVIDER_COPY: Record<OAuthProviderId, { name: string; desc: string; icon: string; color: string }> = {
  slack: { name: 'Slack', desc: 'Send notifications + post decision summaries to channels', icon: '💬', color: 'bg-purple-500/10' },
  notion: { name: 'Notion', desc: 'Mirror docs and link decisions to Notion pages', icon: '📓', color: 'bg-slate-500/10' },
  github: { name: 'GitHub', desc: 'Link PRs and issues to nodes; reflect status changes', icon: '🐙', color: 'bg-slate-500/10' },
  linear: { name: 'Linear', desc: 'Sync issues and projects from Linear into the canvas', icon: '⚡', color: 'bg-violet-500/10' },
  trello: { name: 'Trello', desc: 'Import boards and lists as workspaces', icon: '📋', color: 'bg-blue-500/10' },
  asana: { name: 'Asana', desc: 'Sync tasks and projects from Asana', icon: '✅', color: 'bg-rose-500/10' },
  jira: { name: 'Jira', desc: 'Import and sync Jira issues bidirectionally', icon: '🔵', color: 'bg-blue-500/10' },
}

export default async function IntegrationsPage({ params }: { params: { slug: string } }) {
  const { userId } = await safeAuth()
  if (!userId) redirect('/sign-in')

  const workspace = await getWorkspaceBySlug(params.slug)
  if (!workspace) notFound()

  // dev-without-Supabase: skip the DB membership check + render the
  // page with empty connections. Provider-configured state still
  // reads from env vars and is independent of the DB.
  let connections: Awaited<ReturnType<typeof listOAuthConnections>> = []
  if (hasValidDatabaseUrl) {
    const authorized = await verifyWorkspaceMember(userId, workspace.id)
    if (!authorized) redirect(`/workspace/${params.slug}`)
    connections = await listOAuthConnections(workspace.id)
  }

  // Index connections by provider for the per-tile badge.
  const byProvider = new Map<string, typeof connections>()
  for (const c of connections) {
    const list = byProvider.get(c.provider) ?? []
    list.push(c)
    byProvider.set(c.provider, list)
  }

  const providerRows = KNOWN_PROVIDER_IDS.map((id) => ({
    id,
    copy: PROVIDER_COPY[id],
    configured: isProviderConfigured(id),
    connections: byProvider.get(id) ?? [],
  }))

  const connectedRows = providerRows.filter((p) => p.connections.length > 0)
  const availableRows = providerRows.filter((p) => p.connections.length === 0)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
        <Plug className="h-6 w-6 text-brand" />
        Integrations
      </h1>
      <p className="mt-1 text-sm text-slate-400">Connect your favorite tools to Lazynext.</p>

      {/* Renders only when the OAuth callback redirected back here
          with ?oauth_connected=<provider> or ?oauth_error=<code>.
          Self-clears the query string after first paint. */}
      <div className="mt-6">
        <OAuthStatusBanner />
      </div>

      {/* Connected — populated when an OAuth callback successfully writes a row */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Connected</h2>
        {connectedRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
            <Plug className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-300">No integrations connected yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Pick a provider below to start. The Connect button is enabled once the OAuth credentials for that provider are configured on this deployment.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connectedRows.map((row) => (
              <ConnectionTile
                key={row.id}
                workspaceId={workspace.id}
                providerId={row.id}
                providerName={row.copy.name}
                providerDesc={row.copy.desc}
                providerIcon={row.copy.icon}
                providerColor={row.copy.color}
                connections={row.connections.map((c) => ({
                  id: c.id,
                  displayName: c.displayName,
                  externalId: c.externalId,
                  scopes: c.scopes,
                  createdAt: c.createdAt,
                }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Available — every roadmap provider; Connect button enabled when env-configured */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Available</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {availableRows.map((row) => (
            <div
              key={row.id}
              className={cn(
                'flex items-center justify-between rounded-xl border bg-slate-900 p-4',
                row.configured ? 'border-slate-800' : 'border-slate-800 opacity-80',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-xl', row.copy.color)}>{row.copy.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-200">{row.copy.name}</p>
                    {row.configured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-3xs font-medium text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Available
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-3xs font-medium text-slate-400">
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{row.copy.desc}</p>
                </div>
              </div>
              {row.configured ? (
                <a
                  href={`/api/v1/oauth/${row.id}/start?workspaceId=${workspace.id}`}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Connect
                </a>
              ) : (
                <button
                  disabled
                  title="Set LAZYNEXT_OAUTH_<PROVIDER>_CLIENT_ID and CLIENT_SECRET to enable this provider"
                  className="cursor-not-allowed rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-500"
                >
                  Configure to enable
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Access */}
      <ApiKeysPanel
        workspaceId={workspace.id}
        plan={workspace.plan}
        unlockedPlans={API_KEYS_UNLOCKED_PLANS}
      />
    </div>
  )
}
