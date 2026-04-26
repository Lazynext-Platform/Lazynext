'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Shield, Monitor, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { UserWorkspace } from '@/lib/data/workspace'

type Tab = 'profile' | 'security' | 'preferences' | 'sessions'

interface Props {
  initial: {
    firstName: string
    lastName: string
    fullName: string
    email: string
    role: string
    avatarUrl: string | null
    initials: string
    providers: string[]
    lastSignInAt: string | null
  }
  workspaces: UserWorkspace[]
  currentSlug: string
}

const KNOWN_PROVIDERS = ['google', 'github', 'azure', 'apple', 'gitlab', 'bitbucket', 'discord', 'slack']

export function ProfileClient({ initial, workspaces, currentSlug }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('profile')
  const [darkMode, setDarkMode] = useState(true)
  const [aiSuggestions, setAiSuggestions] = useState(true)
  const [firstName, setFirstName] = useState(initial.firstName)
  const [lastName, setLastName] = useState(initial.lastName)
  const [role, setRole] = useState(initial.role)

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'security' as Tab, label: 'Security', icon: Shield },
    { id: 'preferences' as Tab, label: 'Preferences', icon: Settings },
    { id: 'sessions' as Tab, label: 'Sessions', icon: Monitor },
  ]

  // Compute Connected accounts from real Supabase identity providers.
  const providerSet = new Set(initial.providers.map((p) => p.toLowerCase()))
  // Always show the four most common providers; mark connected if seen.
  const accounts = ['google', 'github', 'slack', 'azure'].map((id) => ({
    id,
    name: id === 'azure' ? 'Microsoft' : id.charAt(0).toUpperCase() + id.slice(1),
    connected: providerSet.has(id),
  }))
  // Surface any provider the user has that's outside the default 4.
  for (const p of providerSet) {
    if (!['google', 'github', 'slack', 'azure'].includes(p)) {
      accounts.push({
        id: p,
        name: KNOWN_PROVIDERS.includes(p) ? p.charAt(0).toUpperCase() + p.slice(1) : p,
        connected: true,
      })
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-slate-50">Account Settings</h1>
      <p className="mt-1 text-sm text-slate-400">Manage your profile, security, and preferences.</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'bg-brand text-brand-foreground' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
            )}
          >
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
              {initial.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={initial.avatarUrl}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-brand text-2xl font-bold text-brand-foreground">
                  {initial.initials}
                </div>
              )}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-first-name" className="block text-xs text-slate-500">First name</label>
                    <input
                      id="profile-first-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-last-name" className="block text-xs text-slate-500">Last name</label>
                    <input
                      id="profile-last-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="profile-email" className="block text-xs text-slate-500">Email</label>
                  <input
                    id="profile-email"
                    value={initial.email}
                    readOnly
                    aria-readonly="true"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-300 focus:border-brand focus:outline-none"
                  />
                  <p className="mt-1 text-2xs text-slate-600">Managed by Supabase Auth.</p>
                </div>
                <div>
                  <label htmlFor="profile-role" className="block text-xs text-slate-500">Role / Title</label>
                  <input
                    id="profile-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Product Manager"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <button className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover">
              Save changes
            </button>
          </div>

          {/* Workspaces — real list from getUserWorkspaces */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Your Workspaces</h2>
              <Link
                href="/onboarding/create-workspace"
                className="text-xs font-medium text-brand hover:text-brand-hover"
              >
                + New workspace
              </Link>
            </div>
            {workspaces.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">You aren&apos;t in any workspaces yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {workspaces.map((ws) => {
                  const isActive = ws.slug === currentSlug
                  return (
                    <button
                      key={ws.id}
                      onClick={() => {
                        if (!isActive) router.push(`/workspace/${ws.slug}/profile`)
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg border bg-slate-800 p-3 text-left transition-colors',
                        isActive ? 'border-emerald-500/30' : 'border-slate-700 hover:border-slate-600',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-xs font-bold text-brand">
                          {ws.name[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{ws.name}</p>
                          <p className="text-2xs text-slate-500">
                            {ws.plan.charAt(0).toUpperCase() + ws.plan.slice(1)} ·{' '}
                            {ws.isOwner ? 'Owner' : ws.role.charAt(0).toUpperCase() + ws.role.slice(1)}
                          </p>
                        </div>
                      </div>
                      {isActive && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-medium text-emerald-400">
                          Active
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Password</h3>
                <p className="text-xs text-slate-500">
                  {initial.providers.length > 0 && !initial.providers.includes('email')
                    ? `Sign-in is handled by ${initial.providers.join(', ')}.`
                    : 'Use the link below to change your password.'}
                </p>
              </div>
              <Link
                href="/auth/reset-password"
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
              >
                Change password
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500">Configured in your Supabase Auth settings.</p>
              </div>
              <span className="rounded-full bg-slate-700 px-2 py-0.5 text-2xs font-medium text-slate-300">
                Managed externally
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-sm font-semibold text-slate-200">Connected Accounts</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Sign-in providers linked to {initial.email}.
            </p>
            <div className="mt-3 space-y-2">
              {accounts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-3"
                >
                  <span className="text-sm text-slate-200">{a.name}</span>
                  {a.connected ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs text-emerald-400">
                      Connected
                    </span>
                  ) : (
                    <span className="text-2xs text-slate-500">Not linked</span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 p-5">
            <h3 className="text-sm font-semibold text-red-400">Delete Account</h3>
            <p className="mt-1 text-xs text-slate-400">
              Permanently delete your account and all data. This cannot be undone.
            </p>
            <button className="mt-3 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10">
              Delete my account
            </button>
          </div>
        </div>
      )}

      {/* Preferences */}
      {tab === 'preferences' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">Appearance</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Dark mode</p>
                <p className="text-xs text-slate-500">Always use dark theme</p>
              </div>
              <label className="relative cursor-pointer">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={() => setDarkMode(!darkMode)}
                  aria-label="Toggle dark mode"
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-brand" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">AI &amp; LazyMind</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">AI suggestions</p>
                <p className="text-xs text-slate-500">Show proactive LazyMind suggestions</p>
              </div>
              <label className="relative cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiSuggestions}
                  onChange={() => setAiSuggestions(!aiSuggestions)}
                  aria-label="Toggle AI suggestions"
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-brand" />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
              </label>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-200">Notifications</h3>
            {['Email notifications', 'Weekly digest', 'Task assignments', 'Decision logged', 'Thread mentions'].map((item) => (
              <div key={item} className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-300">{item}</span>
                <label className="relative cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    aria-label={`Toggle ${item}`}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-brand" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions — Supabase doesn't expose a per-device session list to the client. */}
      {tab === 'sessions' && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Monitor className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Current session</p>
                <p className="text-2xs text-slate-500">
                  {initial.lastSignInAt
                    ? `Signed in ${new Date(initial.lastSignInAt).toLocaleString()}`
                    : 'Active right now'}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
            <Shield className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-3 text-sm font-medium text-slate-300">Per-device session list isn&apos;t available</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
              Supabase Auth doesn&apos;t expose a list of every device that has signed in. To revoke access on a lost device, sign out and rotate your password — every refresh token will be invalidated.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
