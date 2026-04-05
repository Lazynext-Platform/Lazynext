'use client'

import { useState } from 'react'
import { Users, Plus, Search, MoreHorizontal, Mail, Shield, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const members = [
  { id: '1', name: 'Avas Patel', email: 'avas@lazynext.com', role: 'admin', avatar: 'AP', joinedAt: 'Jan 2026' },
  { id: '2', name: 'Priya Shah', email: 'priya@team.com', role: 'member', avatar: 'PS', joinedAt: 'Feb 2026' },
  { id: '3', name: 'Rahul Dev', email: 'rahul@team.com', role: 'member', avatar: 'RD', joinedAt: 'Mar 2026' },
]

const pendingInvites = [
  { email: 'new@team.com', role: 'member', sentAt: '2 days ago' },
]

export default function MembersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = members.filter(
    (m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <Users className="h-6 w-6 text-brand" />
            Team Members
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {members.length} members · {pendingInvites.length} pending · 10 seat limit
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Invite
        </button>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
        />
      </div>

      {/* Members table */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-[1fr,auto,auto] items-center gap-4 border-b border-slate-800 px-4 py-2.5 text-xs font-medium text-slate-500">
          <span>Member</span>
          <span>Role</span>
          <span className="w-8" />
        </div>
        {filtered.map((m) => (
          <div key={m.id} className="grid grid-cols-[1fr,auto,auto] items-center gap-4 border-b border-slate-800 px-4 py-3 last:border-0 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                {m.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{m.name}</p>
                <p className="text-xs text-slate-500 truncate">{m.email}</p>
              </div>
            </div>
            <span className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
              m.role === 'admin' ? 'bg-brand/10 text-brand' : 'bg-slate-700 text-slate-300'
            )}>
              {m.role}
            </span>
            <button className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-300">Pending Invitations</h2>
          <div className="mt-2 space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.email} className="flex items-center justify-between rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-300">{invite.email}</p>
                    <p className="text-xs text-slate-500">Sent {invite.sentAt} · {invite.role}</p>
                  </div>
                </div>
                <button className="text-xs text-red-400 hover:text-red-300">Revoke</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Invite Team Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Email address</label>
                <input
                  type="email"
                  placeholder="teammate@company.com"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:border-brand focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Role</label>
                <select className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 focus:border-brand focus:outline-none">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="guest">Guest</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors">
                Cancel
              </button>
              <button className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
