'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, X, Send, Command, AlertTriangle, Wand2 } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'
import { useWorkspaceStore } from '@/stores/workspace.store'
import { useUpgradeModal } from '@/stores/upgrade-modal.store'
import { canUseAI } from '@/lib/utils/plan-gates'
import { trackBillingEvent } from '@/lib/utils/telemetry'
import { PLAN_LIMITS } from '@/lib/utils/constants'
import { cn } from '@/lib/utils/cn'
import { WorkflowGeneratorModal } from './WorkflowGeneratorModal'

type Plan = keyof typeof PLAN_LIMITS

interface Message {
  id: string
  role: 'user' | 'ai' | 'welcome' | 'system'
  content: string
}

// In v1.3.3.5 the staged 4-message demo was removed ("Q2 Sprint analysis" /
// "Weekly Digest" with hardcoded counts) along with the fake `setTimeout`
// response handler. The panel now calls `/api/v1/ai/chat`, which fronts
// `callLazyMind` (Groq with Together fallback). When neither key is set,
// the endpoint returns 503 AI_NOT_CONFIGURED and we render the message as
// a system note instead of pretending the AI responded.
const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'welcome',
    content:
      'Ask LazyMind anything about workflow patterns, decision-making, or how to use Lazynext. Free-text chat — no structured analysis of your workspace yet.',
  },
]

// Quick actions kick off real prompts. They are intentionally generic until
// the panel can read live workspace state — promising "Analyze our Q2
// sprint" with no data access was the original demo-data lie.
const quickActions = [
  { label: 'How does Decision DNA scoring work?', query: 'How does Lazynext\'s Decision DNA scoring work, and what makes a decision rigorous?' },
  { label: 'Help me write a decision', query: 'I need to write a decision rationale. What sections should I include and why?' },
  { label: 'When to log a decision', query: 'When should my team log a decision in Lazynext vs just chatting about it?' },
  { label: 'Outcomes vs status', query: 'What\'s the difference between a decision\'s status and its outcome in Lazynext?' },
]

export function LazyMindPanel() {
  const isLazyMindOpen = useUIStore((s) => s.isLazyMindOpen)
  const toggleLazyMind = useUIStore((s) => s.toggleLazyMind)
  const workspace = useWorkspaceStore((s) => s.workspace)
  const plan = (workspace?.plan || 'free') as Plan
  const workspaceId = workspace?.id
  const aiLimit = PLAN_LIMITS[plan].aiQueries
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [aiCount, setAiCount] = useState(0)
  const [isGenOpen, setIsGenOpen] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  // Hydrate the daily count from the server when the workspace + panel
  // open. Without this the badge always reads `0/20` on every page
  // reload, which underrepresents the user's actual remaining quota.
  useEffect(() => {
    if (!isLazyMindOpen || !workspaceId) return
    let cancelled = false
    fetch(`/api/v1/ai/usage?workspaceId=${workspaceId}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return
        const json = (await res.json()) as { data?: { used?: number } }
        if (!cancelled && typeof json.data?.used === 'number') setAiCount(json.data.used)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [isLazyMindOpen, workspaceId])

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

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!canUseAI(plan, aiCount)) {
      trackBillingEvent('paywall.gate.shown', { variant: 'ai-limit', plan, aiCount: String(aiCount) })
      useUpgradeModal.getState().show('ai-limit')
      return
    }
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, workspaceId }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        data?: { content: string }
        error?: string
        variant?: string
        used?: number
        message?: string
      }

      if (res.status === 503 && body.error === 'AI_NOT_CONFIGURED') {
        setMessages((prev) => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: body.message ?? 'LazyMind is not configured on this deployment.',
        }])
        return
      }

      if (res.status === 402 && body.error === 'PLAN_LIMIT_REACHED') {
        // Server-side daily cap hit. Sync the badge to the truth and
        // surface the upgrade modal so the user has a next step.
        if (typeof body.used === 'number') setAiCount(body.used)
        trackBillingEvent('paywall.gate.shown', { variant: 'ai-limit', plan, surface: 'lazymind-server' })
        useUpgradeModal.getState().show('ai-limit')
        // Roll back the user message so the chat doesn't show a
        // pending question with no reply.
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
        return
      }

      if (!res.ok || !body.data) {
        setMessages((prev) => [...prev, {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: body.message ?? 'LazyMind couldn\'t answer that one. Try again in a moment.',
        }])
        return
      }

      setAiCount((c) => c + 1)
      setMessages((prev) => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: body.data!.content,
      }])
    } catch {
      setMessages((prev) => [...prev, {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: 'Network error reaching LazyMind. Check your connection and try again.',
      }])
    } finally {
      setIsTyping(false)
    }
  }, [plan, aiCount, workspaceId])

  if (!isLazyMindOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-96 motion-safe:animate-slide-in-right flex-col border-l border-slate-700 bg-slate-900 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200">LazyMind</p>
          <p className="text-2xs text-slate-500">AI Assistant · Llama 3.3 70B</p>
        </div>
        <span className={cn(
          'rounded-full px-2 py-0.5 text-2xs font-medium',
          aiLimit !== -1 && aiCount >= aiLimit
            ? 'bg-amber-500/10 text-amber-400'
            : 'bg-slate-800 text-slate-400'
        )}>
          {aiLimit === -1 ? `${aiCount} today` : `${aiCount}/${aiLimit} today`}
        </span>
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
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-brand-foreground whitespace-pre-wrap">{msg.content}</div>
              </div>
            )
          }
          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="flex items-start gap-3 motion-safe:animate-fadeIn">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0 rounded-2xl rounded-tl-sm border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-sm text-amber-200">{msg.content}</p>
                </div>
              </div>
            )
          }
          return (
            <div key={msg.id} className="flex items-start gap-3 motion-safe:animate-fadeIn">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/20">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="rounded-2xl rounded-tl-sm border border-slate-700 bg-slate-800 p-3">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{msg.content}</p>
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
        <button
          onClick={() => setIsGenOpen(true)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand-hover transition-colors"
        >
          <Wand2 className="h-3 w-3" />
          Generate a workflow…
        </button>
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
            maxLength={1000}
            enterKeyHint="send"
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={() => sendMessage(input)} disabled={!input.trim()} aria-label="Send message" className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-brand-foreground disabled:opacity-30 hover:bg-brand-hover transition-colors">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="text-3xs text-slate-600">Powered by Llama 3.3 70B via Groq</span>
          <span className="flex items-center gap-0.5 text-3xs text-slate-600"><Command className="h-2.5 w-2.5" />L to toggle</span>
        </div>
      </div>

      {/* AI workflow generator (#41). Self-contained modal; renders only
          when isGenOpen flips so it's invisible on the side panel until
          the user clicks the quick-action pill. */}
      <WorkflowGeneratorModal
        isOpen={isGenOpen}
        onClose={() => setIsGenOpen(false)}
        workspaceId={workspaceId}
        onGenerated={() => setAiCount((c) => c + 1)}
      />
    </div>
  )
}
