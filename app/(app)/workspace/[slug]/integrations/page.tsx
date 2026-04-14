'use client'

import { useState, useRef, useEffect } from 'react'
import { Plug, Copy, CheckCircle2, RefreshCw, Lock } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const connectedIntegrations = [
  { id: 'slack', name: 'Slack', desc: 'Send notifications to Slack channels', icon: '💬', color: 'bg-purple-500/10', connected: true },
  { id: 'notion', name: 'Notion', desc: 'Sync pages and databases', icon: '📝', color: 'bg-slate-500/10', connected: true },
]

const availableIntegrations = [
  { id: 'linear', name: 'Linear', desc: 'Sync issues and projects', icon: '⚡', color: 'bg-violet-500/10' },
  { id: 'github', name: 'GitHub', desc: 'Link PRs and issues to nodes', icon: '🐙', color: 'bg-slate-500/10' },
  { id: 'figma', name: 'Figma', desc: 'Embed design files in docs', icon: '🎨', color: 'bg-pink-500/10' },
  { id: 'google', name: 'Google Drive', desc: 'Attach Drive files to nodes', icon: '📁', color: 'bg-blue-500/10' },
  { id: 'jira', name: 'Jira', desc: 'Import and sync Jira issues', icon: '🔵', color: 'bg-blue-500/10' },
  { id: 'zapier', name: 'Zapier', desc: 'Connect to 5000+ apps', icon: '⚡', color: 'bg-orange-500/10' },
]

export default function IntegrationsPage() {
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  const handleCopy = () => {
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
        <Plug className="h-6 w-6 text-brand" />
        Integrations
      </h1>
      <p className="mt-1 text-sm text-slate-400">Connect your favorite tools to Lazynext.</p>

      {/* Connected */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Connected</h2>
        <div className="space-y-3">
          {connectedIntegrations.map(int => (
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
      </div>

      {/* Available */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Available</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {availableIntegrations.map(int => (
            <div key={int.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-xl', int.color)}>{int.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{int.name}</p>
                  <p className="text-xs text-slate-500">{int.desc}</p>
                </div>
              </div>
              <button className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover">Connect</button>
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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">API Key</p>
              <p className="font-mono text-sm text-slate-200">lnx_sk_••••••••••••••••••••</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopy} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
                {copied ? <><CheckCircle2 className="inline h-3 w-3 mr-1 text-emerald-400" /> Copied!</> : <><Copy className="inline h-3 w-3 mr-1" /> Copy</>}
              </button>
              <button className="text-xs text-red-400 hover:text-red-300"><RefreshCw className="inline h-3 w-3 mr-1" /> Regenerate</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
