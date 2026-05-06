'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Settings, Shield, CreditCard, Users, Bell, Lock, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { hasFeature } from '@/lib/utils/plan-gates'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import type { PLAN_LIMITS } from '@/lib/utils/constants'
import { NotificationsTab } from './NotificationsTab'

type Plan = keyof typeof PLAN_LIMITS

const PLAN_DISPLAY: Record<string, string> = {
  free: 'Free Plan',
  starter: 'Team',
  pro: 'Business',
  business: 'Enterprise',
  enterprise: 'Enterprise',
}

const PLAN_SUMMARY: Record<string, string> = {
  free: '3 members · 5 workflows · 100 nodes · 20 AI queries/day',
  starter: 'Unlimited members, workflows, and nodes · 100 AI queries/day',
  pro: 'Everything in Team + Decision Health, Pulse, Automations · 500 AI queries/day',
  business: 'Everything in Business + SSO, audit log, custom fields · unlimited AI',
  enterprise: 'Everything in Business + SSO, audit log, custom fields · unlimited AI',
}

const tabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
]

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

export default function SettingsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const workspace = useWorkspaceStore((s) => s.workspace)
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const plan = (workspace?.plan || 'free') as Plan
  const hasSso = hasFeature(plan, 'sso')

  const [activeTab, setActiveTab] = useState('general')

  // General tab — controlled inputs hydrated from the store.
  const [name, setName] = useState('')
  const [wsSlug, setWsSlug] = useState('')
  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setWsSlug(workspace.slug)
    }
  }, [workspace])

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'confirming' | 'deleting' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const dirty = workspace !== null && (name.trim() !== workspace.name || wsSlug.trim() !== workspace.slug)
  const validSlug = wsSlug === '' || /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(wsSlug)

  async function handleSave() {
    if (!workspace || !dirty) return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const body: Record<string, string> = {}
      if (name.trim() !== workspace.name) body.name = name.trim()
      if (wsSlug.trim() !== workspace.slug) body.slug = wsSlug.trim()
      const res = await fetch(`/api/v1/workspace/${workspace.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const code = json?.error
        setSaveError(
          code === 'SLUG_TAKEN' ? 'That URL is already taken — pick another.'
          : code === 'VALIDATION_ERROR' ? 'Slug must be lowercase letters, numbers, and dashes.'
          : code === 'FORBIDDEN' ? 'Only owners and admins can rename a workspace.'
          : (json?.message || code || 'Save failed.')
        )
        setSaveStatus('error')
        return
      }
      const updated = json?.data
      if (updated) {
        setWorkspace(updated)
        setSaveStatus('saved')
        // If slug changed, redirect to the new URL.
        if (updated.slug !== slug) {
          router.replace(`/workspace/${updated.slug}/settings`)
        }
        setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2500)
      }
    } catch {
      setSaveError('Network error. Try again.')
      setSaveStatus('error')
    }
  }

  async function handleDelete() {
    if (!workspace) return
    setDeleteStatus('deleting')
    setDeleteError(null)
    try {
      const res = await fetch(`/api/v1/workspace/${workspace.slug}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setDeleteError(
          json?.error === 'FORBIDDEN' ? (json?.message || 'Only the workspace owner can delete it.')
          : (json?.message || json?.error || 'Delete failed.')
        )
        setDeleteStatus('error')
        return
      }
      router.replace('/onboarding')
    } catch {
      setDeleteError('Network error. Try again.')
      setDeleteStatus('error')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-slate-50">Workspace Settings</h1>
      <p className="mt-1 text-sm text-slate-400">Manage your workspace configuration.</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-brand text-brand-foreground'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {activeTab === 'general' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">Workspace Info</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="workspace-name" className="block text-sm font-medium text-slate-300">Workspace name</label>
                <input
                  id="workspace-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={(e) => { if (!wsSlug || wsSlug === workspace?.slug) setWsSlug(slugify(e.target.value)) }}
                  maxLength={80}
                  disabled={!workspace}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="workspace-url" className="block text-sm font-medium text-slate-300">Workspace URL</label>
                <div className="mt-1.5 flex items-center rounded-lg border border-slate-700 bg-slate-800">
                  <span className="px-3 text-sm text-slate-500">lazynext.com/workspace/</span>
                  <input
                    id="workspace-url"
                    type="text"
                    value={wsSlug}
                    onChange={(e) => setWsSlug(e.target.value.toLowerCase())}
                    maxLength={50}
                    disabled={!workspace}
                    className="flex-1 bg-transparent px-1 py-2.5 text-sm text-slate-50 focus:outline-none disabled:opacity-60"
                  />
                </div>
                {!validSlug && (
                  <p className="mt-1 text-xs text-red-400">Use lowercase letters, numbers, and dashes only.</p>
                )}
              </div>
              <div>
                <p className="block text-sm font-medium text-slate-300">Logo</p>
                <p className="mt-1 text-xs text-slate-500">
                  Logo uploads ship with the next storage migration. Until then, the workspace name initial is used in the sidebar.
                </p>
              </div>
            </div>
            {saveError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Saved.</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!workspace || !dirty || !validSlug || saveStatus === 'saving'}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveStatus === 'saving' ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>) : 'Save changes'}
            </button>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            <p className="mt-1 text-sm text-slate-400">
              Permanently delete this workspace and all its data. This cannot be undone. Only the owner can do this.
            </p>
            {deleteError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}
            {deleteStatus === 'confirming' ? (
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
                >
                  Yes, delete &ldquo;{workspace?.name}&rdquo;
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteStatus('idle'); setDeleteError(null) }}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            ) : deleteStatus === 'deleting' ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-red-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Deleting workspace…
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteStatus('confirming')}
                disabled={!workspace}
                className="mt-4 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete workspace
              </button>
            )}
          </div>
        </div>
      )}

      {/* Members tab — full directory lives at /members */}
      {activeTab === 'members' && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Team Members</h2>
          <p className="mt-1 text-sm text-slate-400">
            The full member directory, role management, and invitations live on the dedicated members page.
          </p>
          <Link
            href={`/workspace/${slug}/members`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors"
          >
            <Users className="h-4 w-4" /> Open Members
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Billing tab */}
      {activeTab === 'billing' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold text-slate-100">Current Plan</h2>
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  {PLAN_DISPLAY[plan] ?? 'Free Plan'}
                </p>
                <p className="text-xs text-slate-500">{PLAN_SUMMARY[plan] ?? PLAN_SUMMARY.free}</p>
              </div>
              {plan === 'free' ? (
                <button
                  type="button"
                  onClick={() => {
                    trackBillingEvent('paywall.gate.shown', { variant: 'full-upgrade', plan, surface: 'settings-billing' })
                    useUpgradeModal.getState().show('full-upgrade')
                  }}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors"
                >
                  Upgrade
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    trackBillingEvent('paywall.gate.shown', { variant: 'full-upgrade', plan, surface: 'settings-billing' })
                    useUpgradeModal.getState().show('full-upgrade')
                  }}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                >
                  Change plan
                </button>
              )}
            </div>
          </div>

          {plan !== 'free' && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold text-slate-100">Subscription</h2>
              <p className="mt-1 text-xs text-slate-500">
                Invoices, payment method, and cancellation are managed on Gumroad.
              </p>
              <a
                href="https://app.gumroad.com/subscriptions"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Open Gumroad subscription portal
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7v7M10 14L21 3M21 14v7H3V3h7" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && <NotificationsTab workspaceId={workspace?.id ?? null} />}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Security Settings</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">Two-factor authentication</p>
                <p className="text-xs text-slate-500">Add an extra layer of security</p>
              </div>
              <span className="text-xs text-slate-500">Managed by Supabase Auth</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">SSO / SAML</p>
                <p className="text-xs text-slate-500">
                  {hasSso
                    ? 'Map corporate identity. Contact support to complete SAML setup.'
                    : 'Enterprise single sign-on — map corporate identity with audit log.'}
                </p>
              </div>
              {hasSso ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-400">
                  Enabled
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    trackBillingEvent('paywall.gate.shown', { variant: 'sso-gate', plan })
                    useUpgradeModal.getState().show('sso-gate')
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/5 px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
                >
                  <Lock className="h-3 w-3" />
                  Unlock
                </button>
              )}
            </div>
            {/* #43 — Audit log entry point. The page itself FeatureGate's
             * to Business+ so we render the link unconditionally and let
             * the gate handle paywall messaging. Link is the same shape
             * regardless of plan so the "Unlock" badge stays informative
             * rather than the only clickable element. */}
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">Audit log</p>
                <p className="text-xs text-slate-500">
                  {hasFeature(plan, 'audit-log')
                    ? 'Every workspace mutation — actor, action, target, IP, timestamp.'
                    : 'Business plan — searchable trail of every workspace mutation. Required for SOC-2 evidence.'}
                </p>
              </div>
              <Link
                href={`/workspace/${slug}/audit-log`}
                className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                Open audit log
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
