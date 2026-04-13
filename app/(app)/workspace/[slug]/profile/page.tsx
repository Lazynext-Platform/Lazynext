'use client'

import { useState } from 'react'
import { User, Shield, Monitor, Laptop, Smartphone, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type Tab = 'profile' | 'security' | 'preferences' | 'sessions'

const workspaces = [
  { name: 'Lazynext', slug: 'lazynext', plan: 'Starter', role: 'Owner', active: true },
  { name: 'Side Project', slug: 'side-project', plan: 'Free', role: 'Admin', active: false },
]

const sessions = [
  { device: 'MacBook Air — Chrome', location: 'San Francisco, US', ip: '104.xx.xx.42', lastActive: 'Now', current: true },
  { device: 'iPhone 15 — Safari', location: 'San Francisco, US', ip: '104.xx.xx.42', lastActive: '2 hours ago', current: false },
  { device: 'Windows PC — Firefox', location: 'London, UK', ip: '82.xx.xx.88', lastActive: '3 days ago', current: false },
]

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [darkMode, setDarkMode] = useState(true)
  const [aiSuggestions, setAiSuggestions] = useState(true)

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'security' as Tab, label: 'Security', icon: Shield },
    { id: 'preferences' as Tab, label: 'Preferences', icon: Settings },
    { id: 'sessions' as Tab, label: 'Sessions', icon: Monitor },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-slate-50">Account Settings</h1>
      <p className="mt-1 text-sm text-slate-400">Manage your profile, security, and preferences.</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors', tab === t.id ? 'bg-brand text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === 'profile' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">Personal Info</h2>
            <div className="mt-4 flex items-start gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand text-2xl font-bold text-white">AP</div>
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500">First name</label>
                    <input defaultValue="Avas" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Last name</label>
                    <input defaultValue="Patel" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500">Email</label>
                  <input defaultValue="avas@lazynext.com" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500">Role / Title</label>
                  <input defaultValue="Founder & Developer" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none" />
                </div>
              </div>
            </div>
            <button className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">Save changes</button>
          </div>

          {/* Workspaces */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">Your Workspaces</h2>
            <div className="mt-4 space-y-2">
              {workspaces.map(ws => (
                <div key={ws.slug} className={cn('flex items-center justify-between rounded-lg border bg-slate-800 p-3', ws.active ? 'border-emerald-500/30' : 'border-slate-700')}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-xs font-bold text-brand">{ws.name[0]}</div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{ws.name}</p>
                      <p className="text-2xs text-slate-500">{ws.plan} · {ws.role}</p>
                    </div>
                  </div>
                  {ws.active && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-medium text-emerald-400">Active</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div><h3 className="text-sm font-semibold text-slate-200">Password</h3><p className="text-xs text-slate-500">Last changed 30 days ago</p></div>
              <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">Change password</button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div><h3 className="text-sm font-semibold text-slate-200">Two-Factor Authentication</h3><p className="text-xs text-slate-500">Managed via Supabase Auth</p></div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-medium text-emerald-400">Enabled</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-200">Connected Accounts</h3>
            <div className="mt-3 space-y-2">
              {[{ name: 'Google', connected: true }, { name: 'GitHub', connected: true }, { name: 'Slack', connected: false }].map(a => (
                <div key={a.name} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <span className="text-sm text-slate-200">{a.name}</span>
                  {a.connected ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs text-emerald-400">Connected</span>
                      <button className="text-xs text-red-400 hover:text-red-300">Disconnect</button>
                    </div>
                  ) : (
                    <button className="text-xs text-brand hover:text-brand-hover">Connect</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 p-5">
            <h3 className="text-sm font-semibold text-red-400">Delete Account</h3>
            <p className="mt-1 text-xs text-slate-400">Permanently delete your account and all data. This cannot be undone.</p>
            <button className="mt-3 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10">Delete my account</button>
          </div>
        </div>
      )}

      {/* Preferences */}
      {tab === 'preferences' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Appearance</h3>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-300">Dark mode</p><p className="text-xs text-slate-500">Always use dark theme</p></div>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} className="peer sr-only" />
                <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-brand transition-colors" />
                <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">AI & LazyMind</h3>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-slate-300">AI suggestions</p><p className="text-xs text-slate-500">Show proactive LazyMind suggestions</p></div>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={aiSuggestions} onChange={() => setAiSuggestions(!aiSuggestions)} className="peer sr-only" />
                <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-brand transition-colors" />
                <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">Notifications</h3>
            {['Email notifications', 'Weekly digest', 'Task assignments', 'Decision logged', 'Thread mentions'].map(item => (
              <div key={item} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-300">{item}</span>
                <label className="relative cursor-pointer">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-brand transition-colors" />
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      {tab === 'sessions' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Active Sessions</h2>
            <button className="text-xs text-red-400 hover:text-red-300">Revoke all other sessions</button>
          </div>
          {sessions.map((s, i) => (
            <div key={i} className={cn('flex items-center justify-between rounded-xl border bg-slate-900 p-4', s.current ? 'border-emerald-500/30' : 'border-slate-800')}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800">
                  {s.device.includes('MacBook') ? <Laptop className="h-4 w-4 text-slate-400" /> : s.device.includes('iPhone') ? <Smartphone className="h-4 w-4 text-slate-400" /> : <Monitor className="h-4 w-4 text-slate-400" />}
                </div>
                <div>
                  <p className="text-sm text-slate-200">{s.device}</p>
                  <p className="text-2xs text-slate-500">{s.location} · {s.ip} · {s.lastActive}</p>
                </div>
              </div>
              {s.current ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-medium text-emerald-400">Current</span>
              ) : (
                <button className="text-xs text-red-400 hover:text-red-300">Revoke</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
