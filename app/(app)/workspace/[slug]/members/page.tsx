'use client'

import { useState } from 'react'
import { Users, Plus, Search, MoreHorizontal, Mail, X, Crown, ShieldCheck, UserCheck, Eye } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const roleConfig: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  owner: { label: 'Owner', color: 'bg-amber-500/10 text-amber-400 border-amber-800/30', icon: Crown },
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400 border-purple-800/30', icon: ShieldCheck },
  member: { label: 'Member', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-800/30', icon: UserCheck },
  guest: { label: 'Guest', color: 'bg-slate-500/10 text-slate-400 border-slate-700', icon: Eye },
}

const members = [
  { id: '1', name: 'Avas Patel', email: 'avas@lazynext.com', role: 'owner', avatar: 'AP', color: 'bg-indigo-500', joinedAt: 'Jan 2026', tasks: 14, decisions: 8 },
  { id: '2', name: 'Priya Shah', email: 'priya@team.com', role: 'admin', avatar: 'PS', color: 'bg-emerald-500', joinedAt: 'Feb 2026', tasks: 11, decisions: 5 },
  { id: '3', name: 'Rahul Dev', email: 'rahul@team.com', role: 'member', avatar: 'RD', color: 'bg-amber-500', joinedAt: 'Mar 2026', tasks: 18, decisions: 3 },
  { id: '4', name: 'Sana Malik', email: 'sana@team.com', role: 'member', avatar: 'SM', color: 'bg-pink-500', joinedAt: 'Mar 2026', tasks: 6, decisions: 2 },
]

const pendingInvites = [
  { email: 'new@team.com', role: 'member', sentAt: '2 days ago' },
  { email: 'contractor@external.com', role: 'guest', sentAt: '5 days ago' },
]

const seatLimit = 10

export default function MembersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [emailChips, setEmailChips] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')

  const filtered = members.filter(
    (m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalSeats = members.length + pendingInvites.length
  const seatPct = Math.round((totalSeats / seatLimit) * 100)

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && emailInput.trim()) {
      e.preventDefault()
      if (emailInput.includes('@') && !emailChips.includes(emailInput.trim())) {
        setEmailChips(prev => [...prev, emailInput.trim()])
      }
      setEmailInput('')
    }
    if (e.key === 'Backspace' && !emailInput && emailChips.length > 0) {
      setEmailChips(prev => prev.slice(0, -1))
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-50">
            <Users className="h-6 w-6 text-brand" />
            Team Members
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {members.length} members · {pendingInvites.length} pending
          </p>
        </div>
        <button onClick={() => { setShowInviteModal(true); setEmailChips([]); setEmailInput('') }}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover transition-colors">
          <Plus className="h-4 w-4" /> Invite
        </button>
      </div>

      {/* Stats bar */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Total Members</p>
          <p className="mt-1 text-xl font-bold text-slate-50">{members.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Pending Invites</p>
          <p className="mt-1 text-xl font-bold text-amber-400">{pendingInvites.length}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs text-slate-500">Seat Usage</p>
          <p className="mt-1 text-xl font-bold text-slate-50">{totalSeats}<span className="text-sm font-normal text-slate-500">/{seatLimit}</span></p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-800">
            <div className={cn('h-full rounded-full', seatPct > 80 ? 'bg-amber-500' : 'bg-brand')} style={{ width: `${seatPct}%` }} />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search members"
          placeholder="Search members..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none" />
      </div>

      {/* Members table */}
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="grid grid-cols-[1fr,auto,auto,auto,auto] items-center gap-4 border-b border-slate-800 px-4 py-2.5 text-2xs font-medium uppercase tracking-wider text-slate-500">
          <span>Member</span>
          <span>Role</span>
          <span className="text-center">Tasks</span>
          <span className="text-center">Decisions</span>
          <span className="w-8" />
        </div>
        {filtered.map((m) => {
          const role = roleConfig[m.role]
          const RoleIcon = role.icon
          return (
            <div key={m.id} className="grid grid-cols-[1fr,auto,auto,auto,auto] items-center gap-4 border-b border-slate-800 px-4 py-3 last:border-0 hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-2xs font-bold text-white', m.color)}>
                  {m.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{m.name}</p>
                  <p className="text-xs text-slate-500 truncate">{m.email}</p>
                </div>
              </div>
              <span className={cn('flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold', role.color)}>
                <RoleIcon className="h-3 w-3" /> {role.label}
              </span>
              <span className="text-center text-sm text-slate-300">{m.tasks}</span>
              <span className="text-center text-sm text-slate-300">{m.decisions}</span>
              <button className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-300">Pending Invitations</h2>
          <div className="mt-2 space-y-2">
            {pendingInvites.map((invite) => {
              const role = roleConfig[invite.role]
              return (
                <div key={invite.email} className="flex items-center justify-between rounded-lg border border-dashed border-slate-700 bg-slate-900/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <div>
                      <p className="text-sm text-slate-300">{invite.email}</p>
                      <p className="text-xs text-slate-500">Sent {invite.sentAt} · <span className={cn('font-medium', role.color.split(' ')[1])}>{role.label}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-xs text-brand hover:text-brand-hover">Resend</button>
                    <button className="text-xs text-red-400 hover:text-red-300">Revoke</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Invite Modal with email chips */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Invite Team Members</h2>
              <button onClick={() => setShowInviteModal(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Email addresses</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 min-h-[42px] focus-within:border-brand">
                  {emailChips.map(chip => (
                    <span key={chip} className="flex items-center gap-1 rounded-full bg-brand/20 px-2.5 py-0.5 text-xs font-medium text-brand">
                      {chip}
                      <button onClick={() => setEmailChips(prev => prev.filter(c => c !== chip))} aria-label={`Remove ${chip}`} className="rounded-full hover:bg-brand/30"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input type="text" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={handleEmailKeyDown}
                    placeholder={emailChips.length === 0 ? 'teammate@company.com (press Enter to add)' : 'Add more...'}
                    className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-50 placeholder-slate-500 outline-none" />
                </div>
                <p className="mt-1 text-2xs text-slate-600">Separate multiple emails with Enter or comma</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Role</label>
                <select className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-50 focus:border-brand focus:outline-none">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="guest">Guest (read-only)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 rounded-lg border border-slate-700 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800">Cancel</button>
              <button className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
                Send {emailChips.length > 0 ? `${emailChips.length} Invite${emailChips.length > 1 ? 's' : ''}` : 'Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
