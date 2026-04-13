import type { Metadata } from 'next'
import { CheckCircle, Users, TrendingUp, Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign In — Lazynext',
  description: 'Sign in to your Lazynext workspace. Tasks, docs, decisions, and AI in one place.',
}

const features = [
  {
    icon: CheckCircle,
    title: 'Decision DNA',
    desc: 'Capture every decision with context, rationale, and quality scoring.',
  },
  {
    icon: Users,
    title: 'Unified Workflows',
    desc: 'Projects, tasks, docs, and decisions in one connected workspace.',
  },
  {
    icon: TrendingUp,
    title: 'AI-Powered Insights',
    desc: 'Get smart suggestions and analytics to keep your team on track.',
  },
]

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left Brand Panel — Desktop only */}
      <div className="hidden bg-gradient-to-br from-[#4F6EF7] to-[#3D5BD4] lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Lazynext</span>
          </div>

          {/* Headline */}
          <h1 className="mt-12 text-4xl font-bold leading-tight text-white">
            The operating system
            <br />
            for work.
          </h1>
          <p className="mt-4 max-w-md text-lg text-blue-100">
            Everything your team needs to move fast and stay aligned.
          </p>

          {/* Feature Cards */}
          <div className="mt-12 space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <p className="mt-0.5 text-sm text-blue-100">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-blue-200">
          &copy; {new Date().getFullYear()} Lazynext. All rights reserved.
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="flex w-full flex-col items-center justify-center bg-white p-6 sm:p-12 lg:w-1/2">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F6EF7]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Lazynext</span>
        </div>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
