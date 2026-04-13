'use client'

import { createClient } from '@/lib/db/supabase/client'
import { useState } from 'react'
import Link from 'next/link'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (success) {
    return (
      <div className="w-full max-w-sm text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
        <p className="text-slate-500 mb-4">We sent a confirmation link to <strong>{email}</strong></p>
        <Link href="/sign-in" className="text-brand hover:text-brand-hover">← Back to sign in</Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Sign Up</h2>
      <p className="text-slate-500 mb-6">Create your Lazynext account</p>

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
        <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400">or</span></div>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label htmlFor="signup-name" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input
            id="signup-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand focus:border-transparent outline-none"
            minLength={6}
            maxLength={128}
            required
          />
        </div>
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-brand hover:text-brand-hover">Sign in</Link>
      </p>
    </div>
  )
}
