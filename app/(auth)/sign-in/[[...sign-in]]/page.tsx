'use client'

import { createClient } from '@/lib/db/supabase/client'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// Only allow internal redirects — never honour an absolute URL or
// protocol-relative URL from the query string.
function safeNext(raw: string | null): string {
  if (!raw) return '/onboarding/create-workspace'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/onboarding/create-workspace'
  return raw
}

export default function SignInPage() {
  const searchParams = useSearchParams()
  const next = safeNext(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = next
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign In</h1>
      <p className="text-slate-500 mb-6">Welcome back to Lazynext</p>

      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleOAuth('google')}
          aria-label="Continue with Google"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Continue with Google
        </button>
        <button
          onClick={() => handleOAuth('github')}
          aria-label="Continue with GitHub"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Continue with GitHub
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
        <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-600">or</span></div>
      </div>

      <form onSubmit={handleSignIn} noValidate className="space-y-4">
        <div>
          <label htmlFor="signin-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={!!error}
            aria-describedby={error ? 'signin-error' : undefined}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="signin-password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            id="signin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            aria-invalid={!!error}
            aria-describedby={error ? 'signin-error' : undefined}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
            minLength={6}
            maxLength={128}
            required
          />
        </div>
        {error && <p id="signin-error" className="text-sm text-red-500" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-hover transition-colors disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="font-semibold text-slate-900 underline decoration-brand decoration-2 underline-offset-2 hover:bg-brand/20">Sign up</Link>
      </p>
    </div>
  )
}
