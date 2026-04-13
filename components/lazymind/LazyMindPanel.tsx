'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, Command, Mail, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils/cn'

interface Message {
  id: string
  role: 'user' | 'ai' | 'welcome'
  content: string
  structured?: {
    statusSummary?: { label: string; value: string; color: string }[]
    observations?: string[]
    actions?: string[]
    digest?: { completed: string; inProgress: string; quality: string; actionNeeded: string }
  }
}

const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'welcome',
    content: "How can I help with your workflow? I can analyze workflows, generate digests, suggest tasks, and evaluate decision quality.",
  },
  { id: '1', role: 'user', content: 'Analyze our Q2 sprint workflow' },
  {
    id: '2',
    role: 'ai',
    content: "Here's your Q2 Sprint analysis:",
    structured: {
      statusSummary: [
        { label: 'Tasks', value: '12 total', color: 'text-blue-400' },
        { label: 'In Progress', value: '5', color: 'text-amber-400' },
        { label: 'Decisions', value: '4 open', color: 'text-orange-400' },
        { label: 'Health', value: '78/100', color: 'text-emerald-400' },
      ],
      observations: [
        '2 decisions are older than 5 days without resolution',
        '3 tasks have no assignee',
        'Decision quality trending up (+4 from last week)',
      ],
      actions: [
        'Resolve "Pricing model" decision — it\'s blocking 3 tasks',
        'Assign Ship onboarding v2 to unblock pipeline',
        'Tag outcomes on 2 decided decisions for quality tracking',
      ],
    },
  },
  { id: '3', role: 'user', content: 'Give me the weekly digest' },
  {
    id: '4',
    role: 'ai',
    content: 'Weekly Digest — Q2 Product Sprint',
    structured: {
      digest: {
        completed: '4 tasks completed, 3 decisions resolved',
        inProgress: '5 tasks in progress, 2 in review',
        quality: 'Decision quality: 78 → 82 (+4 trend)',
        actionNeeded: '1 blocked task, 2 decisions need outcome tagging',
      },
    },
  },
]

const quickActions = [
  { label: '📊 Analyze Workflow', query: 'Analyze our Q2 sprint workflow' },
  { label: '📋 Weekly Digest', query: "Generate this week's digest" },
  { label: '✅ Suggest Tasks', query: 'Suggest next priority tasks' },
  { label: '🔍 Find Decisions', query: 'Show open decisions needing attention' },
]

export function LazyMindPanel() {
  const { isLazyMindOpen, toggleLazyMind } = useUIStore()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, isTyping])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        toggleLazyMind()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleLazyMind])

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: "Based on the current workflow state, here are insights and recommended actions.",
        structured: {
          actions: [
            'Review and close overdue decisions',
            'Add missing assignees to unowned tasks',
            'Schedule outcome reviews for last week\'s decisions',
          ],
        },
      }
      setMessages((prev) => [...prev, aiMsg])
    }, 1500)
  }, [])

  if (!isLazyMindOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-96 animate-slide-in-right flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">LazyMind</p>
          <p className="text-[10px] text-slate-500">AI Assistant · Llama 3.3 70B</p>
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">34/100 today</span>
        <button onClick={toggleLazyMind} aria-label="Close LazyMind panel" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Chat */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => {
          if (msg.role === 'welcome') {
            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/20">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                </div>
                <p className="text-sm text-slate-400 pt-1">{msg.content}</p>
              </div>
            )
          }
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-white">{msg.content}</div>
              </div>
            )
          }
          return (
            <div key={msg.id} className="flex items-start gap-3 animate-fadeIn">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/20">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 p-3">
                  <p className="text-sm text-slate-300">{msg.content}</p>
                  {msg.structured?.statusSummary && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {msg.structured.statusSummary.map((s) => (
                        <div key={s.label} className="rounded-lg bg-slate-900 p-2">
                          <p className="text-[10px] text-slate-500">{s.label}</p>
                          <p className={cn('text-sm font-semibold', s.color)}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.structured?.observations && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5">⚠ Observations</p>
                      <ul className="space-y-1">
                        {msg.structured.observations.map((o, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400 mt-0.5" />{o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {msg.structured?.actions && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">✓ Recommended Actions</p>
                      <ol className="space-y-1">
                        {msg.structured.actions.map((a, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-bold text-emerald-400">{i + 1}</span>{a}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {msg.structured?.digest && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400"><CheckCircle className="h-3 w-3 text-emerald-400" /><span>{msg.structured.digest.completed}</span></div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><TrendingUp className="h-3 w-3 text-blue-400" /><span>{msg.structured.digest.inProgress}</span></div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><TrendingUp className="h-3 w-3 text-emerald-400" /><span>{msg.structured.digest.quality}</span></div>
                      <div className="flex items-center gap-2 text-xs text-slate-400"><AlertTriangle className="h-3 w-3 text-amber-400" /><span>{msg.structured.digest.actionNeeded}</span></div>
                      <button className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/20 transition-colors">
                        <Mail className="h-3 w-3" />Send as email digest
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/20">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
            </div>
            <div className="flex items-center gap-1 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-thin">
        {quickActions.map((qa) => (
          <button key={qa.label} onClick={() => sendMessage(qa.query)} className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors">
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Ask LazyMind anything..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim()} className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-30 hover:bg-brand-hover transition-colors">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="text-[9px] text-slate-600">Powered by Llama 3.3 70B via Groq</span>
          <span className="flex items-center gap-0.5 text-[9px] text-slate-600"><Command className="h-2.5 w-2.5" />L to toggle</span>
        </div>
      </div>
    </div>
  )
}
