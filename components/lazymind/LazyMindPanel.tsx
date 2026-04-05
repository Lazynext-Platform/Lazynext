'use client'

import { useState } from 'react'
import { Sparkles, Send, X, Loader2 } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvas.store'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function LazyMindPanel() {
  const { isLazyMindOpen, toggleLazyMind } = useCanvasStore()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey! I'm LazyMind. Ask me about your workspace — I can summarize decisions, suggest next steps, or draft docs." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isLazyMindOpen) return null

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch('/api/v1/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest', context: { query: userMessage } }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setMessages((prev) => [...prev, { role: 'assistant', content: data.content }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, I couldn't process that right now. Try again?" }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please check your network.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute right-0 top-0 z-30 flex h-full w-80 flex-col border-l border-slate-800 bg-slate-900 shadow-2xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold text-slate-200">LazyMind</span>
        </div>
        <button
          onClick={toggleLazyMind}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-brand text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask LazyMind..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="rounded-lg bg-brand p-2 text-white hover:bg-brand-hover disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
