'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Upload,
  LayoutTemplate,
  PenLine,
  Check,
  ChevronRight,
} from 'lucide-react'

const setupOptions = [
  {
    id: 'import',
    icon: Upload,
    title: 'Import',
    desc: 'Bring your data from Notion, Linear, Trello, or CSV.',
    badge: null,
  },
  {
    id: 'template',
    icon: LayoutTemplate,
    title: 'Use a Template',
    desc: 'Start with a pre-built workflow for your team type.',
    badge: 'Recommended',
  },
  {
    id: 'blank',
    icon: PenLine,
    title: 'Blank Canvas',
    desc: 'Start from scratch with an empty workflow.',
    badge: null,
  },
]

function ProgressIndicator({ step }: { step: number }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-0">
      {[1, 2, 3].map((s, i) => (
        <div key={s} className="flex items-center">
          {/* Circle */}
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300 ${
              step > s
                ? 'border-emerald-500 bg-emerald-500 text-white'
                : step === s
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-700 bg-transparent text-slate-500'
            }`}
          >
            {step > s ? <Check className="h-4 w-4" /> : s}
          </div>
          {/* Line (not after last) */}
          {i < 2 && (
            <div
              className={`h-0.5 w-16 transition-colors duration-300 sm:w-24 ${
                step > s ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function ConfettiEffect() {
  const colors = [
    '#4F6EF7',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#F97316',
  ]
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 1.5,
    color: colors[i % colors.length],
    size: 4 + Math.random() * 6,
  }))

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti rounded-full"
          style={{
            left: `${p.left}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function CreateWorkspacePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [question, setQuestion] = useState('Which database should we use?')
  const [resolution, setResolution] = useState('')
  const [rationale, setRationale] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [scoreVisible, setScoreVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setStep(2)
  }

  function handleOptionSelect(id: string) {
    setSelectedOption(id)
    setTimeout(() => setStep(3), 400)
  }

  function handleLogDecision(e: React.FormEvent) {
    e.preventDefault()
    setShowSuccess(true)
    setShowConfetti(true)
    setTimeout(() => setScoreVisible(true), 300)
    setTimeout(() => setShowConfetti(false), 3000)
  }

  async function handleGoToWorkspace() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error || 'Failed to create workspace. Please try again.')
        return
      }
      router.push(`/workspace/${slug}/guide`)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      {showConfetti && <ConfettiEffect />}

      {/* Logo */}
      <div className="mb-8">
        <Link href="/">
          <Image src="/logo-dark.png" alt="Lazynext" width={140} height={35} className="h-9 w-auto" priority />
        </Link>
      </div>

      {/* Progress */}
      <ProgressIndicator step={step} />

      {/* Card */}
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8">
        {/* STEP 1 — Workspace Setup */}
        {step === 1 && (
          <div className="motion-safe:animate-fadeIn">
            <h1 className="text-center text-2xl font-bold text-white">
              Let&apos;s set up your workspace
            </h1>
            <p className="mt-2 text-center text-sm text-slate-400">
              This is where your team will collaborate.
            </p>

            <form onSubmit={handleStep1Submit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-300"
                >
                  Workspace name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  maxLength={50}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  autoFocus
                />
                {slug && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    lazynext.com/ws/
                    <span className="text-slate-400">{slug}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!name.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2 — Setup Choice */}
        {step === 2 && (
          <div className="motion-safe:animate-fadeIn">
            <button
              onClick={() => setStep(1)}
              className="mb-4 flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <h1 className="text-center text-2xl font-bold text-white">
              How would you like to start?
            </h1>
            <p className="mt-2 text-center text-sm text-slate-400">
              Pick the setup that works best for your team.
            </p>

            <div className="mt-8 space-y-3">
              {setupOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`flex w-full items-center gap-4 rounded-xl border px-5 py-4 text-left transition-all ${
                    selectedOption === opt.id
                      ? 'border-brand bg-brand/10 shadow-lg shadow-brand/5'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                    <opt.icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {opt.title}
                      </span>
                      {opt.badge && (
                        <span className="rounded-full bg-brand/20 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-brand">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-400">{opt.desc}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — First Decision */}
        {step === 3 && !showSuccess && (
          <div className="motion-safe:animate-fadeIn">
            <button
              onClick={() => {
                setStep(2)
                setSelectedOption(null)
              }}
              className="mb-4 flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <h1 className="text-center text-2xl font-bold text-white">
              Log your first decision
            </h1>
            <p className="mt-2 text-center text-sm text-slate-400">
              Decision DNA is what makes Lazynext unique. Try logging a decision
              your team recently made.
            </p>

            <form onSubmit={handleLogDecision} className="mt-8 space-y-4">
              <div>
                <label htmlFor="question" className="block text-sm font-medium text-slate-300">
                  Question
                </label>
                <input
                  id="question"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="resolution" className="block text-sm font-medium text-slate-300">
                  Resolution
                </label>
                <input
                  id="resolution"
                  type="text"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="What was decided?"
                  className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label htmlFor="rationale" className="block text-sm font-medium text-slate-300">
                  Rationale
                </label>
                <textarea
                  id="rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Why was this the right choice?"
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <button
                type="submit"
                disabled={!question.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Log Decision <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 3 — Success */}
        {step === 3 && showSuccess && (
          <div className="motion-safe:animate-fadeIn text-center">
            {/* Score badge */}
            <div
              className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-emerald-500 transition-all duration-500 ${
                scoreVisible
                  ? 'scale-100 opacity-100'
                  : 'scale-75 opacity-0'
              }`}
            >
              <div>
                <span className="text-3xl font-extrabold text-emerald-400">
                  84
                </span>
                <span className="text-lg text-emerald-400/60">/100</span>
              </div>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-white">
              Your workspace is ready!
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Great first decision. Your team is going to love this.
            </p>

            <button
              onClick={handleGoToWorkspace}
              disabled={loading}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Go to Workspace <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {error && (
              <p className="mt-3 text-center text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
