'use client'

import { Plug, Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// No integrations table or OAuth connectors exist in the schema yet.
// Connected list stays empty until the integrations engine ships.
const connectedIntegrations: { id: string; name: string; desc: string; icon: string; color: string; connected: boolean }[] = []

const availableIntegrations = [
  { id: 'linear', name: 'Linear', desc: 'Sync issues and projects', icon: '⚡', color: 'bg-violet-500/10' },
  { id: 'github', name: 'GitHub', desc: 'Link PRs and issues to nodes', icon: '🐙', color: 'bg-slate-500/10' },
  { id: 'figma', name: 'Figma', desc: 'Embed design files in docs', icon: '🎨', color: 'bg-pink-500/10' },
  { id: 'google', name: 'Google Drive', desc: 'Attach Drive files to nodes', icon: '📁', color: 'bg-blue-500/10' },
  { id: 'jira', name: 'Jira', desc: 'Import and sync Jira issues', icon: '🔵', color: 'bg-blue-500/10' },
  { id: 'zapier', name: 'Zapier', desc: 'Connect to 5000+ apps', icon: '⚡', color: 'bg-orange-500/10' },
]

export default function IntegrationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
        <Plug className="h-6 w-6 text-brand" />
        Integrations
      </h1>
      <p className="mt-1 text-sm text-slate-400">Connect your favorite tools to Lazynext.</p>

      {/* Connected — empty until OAuth connectors ship */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-300">Connected</h2>
        {connectedIntegrations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">
            <Plug className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-300">No integrations connected yet</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              When the OAuth connectors ship, you&apos;ll be able to link Slack, Notion, GitHub and more here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connectedIntegrations.map((int) => (
              <div key={int.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-xl', int.color)}>{int.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200">{int.name}</p>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-3xs font-medium text-emerald-400">Connected</span>
                    </div>
                    <p className="text-xs text-slate-500">{int.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">Configure</button>
                  <button className="text-xs text-red-400 hover:text-red-300">Disconnect</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coming soon — connectors are scoped but not yet shipped */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-300">Coming soon</h2>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-3xs font-medium text-amber-400">In development</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {availableIntegrations.map((int) => (
            <div key={int.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 opacity-80">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-xl', int.color)}>{int.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{int.name}</p>
                  <p className="text-xs text-slate-500">{int.desc}</p>
                </div>
              </div>
              <button
                disabled
                className="cursor-not-allowed rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-500"
              >
                Notify me
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* API Access */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-200">API Access</h2>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-3xs font-bold text-amber-400">Business Plan</span>
          </div>
          <Lock className="h-4 w-4 text-slate-500" />
        </div>
        <p className="mt-1 text-xs text-slate-500">Use the REST API for custom integrations and data management.</p>
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
          <p className="text-xs text-slate-400">
            API key issuance ships with the Business plan. You don&apos;t have a key yet — once issued, it will appear here with copy and rotate controls.
          </p>
          <button
            disabled
            className="mt-3 cursor-not-allowed rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-500"
          >
            Generate API key (coming soon)
          </button>
        </div>
      </div>
    </div>
  )
}
