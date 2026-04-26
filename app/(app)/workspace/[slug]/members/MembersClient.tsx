'use client'

import { useState } from 'react'
import { Users, Plus, Search, MoreHorizontal, X, Crown, UserCheck, Eye, Mail, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import { PLAN_LIMITS } from '@/lib/utils/constants'
import type { MemberUser } from '@/lib/data/workspace'

type Plan = keyof typeof PLAN_LIMITS

const roleConfig: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400 border-purple-800/30', icon: Crown },
  member: { label: 'Member', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-800/30', icon: UserCheck },
  guest: { label: 'Guest', color: 'bg-slate-500/10 text-slate-400 border-slate-700', icon: Eye },
}

interface Props {
  members: (MemberUser & { tasks: number; decisions: number })[]
  workspaceName: string
  workspaceUrl: string
  plan: Plan
  currentUserId: string | null
  ownerId: string | null
}

export function MembersClient({ members, workspaceName, workspaceUrl, plan, ownerId }: Props) {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const memberLimit = PLAN_LIMITS[plan].members
  const currentCount = members.length
  const atMemberLimit = memberLimit !== -1 && currentCount >= memberLimit

  function handleInviteClick() {
    if (atMemberLimit) {
      trackBillingEvent('paywall.gate.shown', {
        variant: 'member-limit',
        plan,
        memberCount: String(currentCount),
      })
      useUpgradeModal.getState().show('member-limit')
      return
    }
    setShowInviteModal(true)
  }

  const filtered = members.filter((m) => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    )
  })

  async function copyInviteUrl() {
    try {
      await navigator.clipboard.writeText(workspaceUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  const seatLimit = memberLimit === -1 ? Math.max(currentCount, 5) : memberLimit
  const seatPct = Math.min(100, Math.round((currentCount / seatLimit) * 100))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <Users className="h-6 w-6 text-brand" />
            Team Members
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {members.length} {members.length === 1 ? 'member' : 'members'} in {workspaceName}
          </p>
        </div>
        <button
          onClick={handleInviteClick}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors"
        >
          <Plus className="h-4 w-4" /> Invite
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Total Members</p>
          <p className="mt-1 text-xl font-bold text-slate-50">{members.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Plan</p>
          <p className="mt-1 text-xl font-bold capitalize text-slate-50">{plan}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Seat usage</p>
          <p className="mt-1 text-xl font-bold text-slate-50">
            {currentCount}
            <span className="text-sm font-normal text-slate-500">
              /{memberLimit === -1 ? '∞' : memberLimit}
            </span>
          </p>
          <div
            className="mt-2 h-1.5 rounded-full bg-slate-800"
            role="progressbar"
            aria-valuenow={seatPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Seat usage"
          >
            <div
              className={cn('h-full rounded-full', seatPct > 80 ? 'bg-amber-500' : 'bg-brand')}
              style={{ width: `${seatPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search members"
          placeholder="Search members..."
          enterKeyHint="search"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="grid grid-cols-[1fr,auto,auto,auto,auto] items-center gap-4 border-b border-slate-800 px-4 py-2.5 text-2xs font-medium uppercase tracking-wider text-slate-500">
          <span>Member</span>
          <span>Role</span>
          <span className="text-center">Open Tasks</span>
          <span className="text-center">Decisions</span>
          <span className="w-8" />
        </div>
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">No members match your search.</p>
        ) : (
          filtered.map((m) => {
            const isOwner = m.userId === ownerId
            const role = isOwner
              ? { label: 'Owner', color: 'bg-amber-500/10 text-amber-400 border-amber-800/30', icon: Crown }
              : roleConfig[m.role] ?? roleConfig.member
            const RoleIcon = role.icon
            const display = m.name || m.email || 'Member'
            return (
              <div
                key={m.userId}
                className="grid grid-cols-[1fr,auto,auto,auto,auto] items-center gap-4 border-b border-slate-800 px-4 py-3 transition-colors last:border-0 hover:bg-slate-800/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-2xs font-bold text-white">
                    {m.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200" title={display}>
                      {display}
                    </p>
                    {m.email && (
                      <p className="truncate text-xs text-slate-500" title={m.email}>
                        {m.email}
                      </p>
                    )}
                  </div>
                </div>
                <span className={cn('flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', role.color)}>
                  <RoleIcon className="h-3 w-3" /> {role.label}
                </span>
                <span className="text-center text-sm text-slate-300">{m.tasks}</span>
                <span className="text-center text-sm text-slate-300">{m.decisions}</span>
                <button className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Invite Team Members</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                aria-label="Close dialog"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Email-based invitations are coming soon. For now, share this workspace
              link — anyone you give it to can sign up and request to join.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />
              <code className="flex-1 truncate text-xs text-slate-300">{workspaceUrl}</code>
              <button
                onClick={copyInviteUrl}
                className="flex shrink-0 items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-2xs font-medium text-slate-300 hover:bg-slate-700"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
