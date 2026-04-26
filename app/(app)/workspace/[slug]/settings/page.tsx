'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Settings, Shield, CreditCard, Users, Bell, Palette, Lock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { hasFeature } from '@/lib/utils/plan-gates'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import type { PLAN_LIMITS } from '@/lib/utils/constants'

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const plan = (useWorkspaceStore((s) => s.workspace?.plan) || 'free') as Plan
  const hasSso = hasFeature(plan, 'sso')
  const params = useParams()
  const slug = params?.slug as string

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
                  defaultValue="My Workspace"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="workspace-url" className="block text-sm font-medium text-slate-300">Workspace URL</label>
                <div className="mt-1.5 flex items-center rounded-lg border border-slate-700 bg-slate-800">
                  <span className="px-3 text-sm text-slate-500">lazynext.com/workspace/</span>
                  <input
                    id="workspace-url"
                    type="text"
                    defaultValue="my-workspace"
                    className="flex-1 bg-transparent px-1 py-2.5 text-sm text-slate-50 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Logo</label>
                <div className="mt-1.5 flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-800 text-slate-500 cursor-pointer hover:border-slate-600 transition-colors">
                  <Palette className="h-6 w-6" />
                </div>
              </div>
            </div>
            <button className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors">
              Save changes
            </button>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            <p className="mt-1 text-sm text-slate-400">
              Permanently delete this workspace and all its data. This cannot be undone.
            </p>
            <button className="mt-4 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors">
              Delete workspace
            </button>
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
                  onClick={() => useUpgradeModal.getState().show('full-upgrade')}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors"
                >
                  Upgrade
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => useUpgradeModal.getState().show('full-upgrade')}
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
      {activeTab === 'notifications' && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold text-slate-100">Notification Preferences</h2>
          <div className="mt-4 space-y-4">
            {['Task assigned to you', 'Decision needs review', 'Weekly digest', 'Thread mentions'].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-sm text-slate-300">{item}</span>
                <button className="relative h-6 w-11 rounded-full bg-brand transition-colors">
                  <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
          </div>
        </div>
      )}
    </div>
  )
}
