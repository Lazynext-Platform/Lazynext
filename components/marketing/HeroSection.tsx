import Link from 'next/link'
import {
  ArrowRight,
  PlayCircle,
  ClipboardList,
  FileText,
  CheckCircle,
  MessageCircle,
} from 'lucide-react'

const heroNodes = [
  {
    type: 'Task',
    icon: ClipboardList,
    title: 'Finalize launch copy',
    meta: 'In Progress',
    metaColor: 'bg-yellow-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500',
    labelColor: 'text-blue-400',
    delay: '0s',
  },
  {
    type: 'Doc',
    icon: FileText,
    title: 'PRD v2.1',
    meta: 'Published',
    metaColor: 'bg-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    iconBg: 'bg-green-500',
    labelColor: 'text-green-400',
    delay: '0.4s',
  },
  {
    type: 'Decision',
    icon: CheckCircle,
    title: 'Go with Stripe',
    meta: null,
    metaColor: '',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
    iconBg: 'bg-orange-500',
    labelColor: 'text-orange-400',
    delay: '0.8s',
    score: '84/100',
  },
  {
    type: 'Thread',
    icon: MessageCircle,
    title: 'Pricing debate',
    meta: '12 replies',
    metaColor: '',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    iconBg: 'bg-purple-500',
    labelColor: 'text-purple-400',
    delay: '1.2s',
  },
]

export default function HeroSection() {
  return (
    <section className="gradient-hero pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="mx-auto max-w-[1280px] px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-[#4F6EF7]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#4F6EF7]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4F6EF7]" />
          The Anti-Software Workflow Platform
        </div>

        {/* Headline */}
        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          One platform that replaces every tool your team is{' '}
          <span className="text-[#4F6EF7]">already misusing.</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
          Stop switching apps. Start shipping work. Lazynext is the operating
          system for work &mdash; tasks, docs, decisions, and AI in one unified
          graph.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-xl bg-[#4F6EF7] px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-colors hover:bg-[#3D5BD4]"
          >
            Start Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="inline-flex items-center rounded-xl border-2 border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-700 transition-colors hover:border-[#4F6EF7] hover:text-[#4F6EF7]"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Watch Demo
          </Link>
        </div>

        {/* Canvas Mockup */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-slate-700/50 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-4 text-xs font-medium text-slate-500">
                Lazynext Canvas &mdash; Q4 Product Launch
              </span>
            </div>
            {/* Canvas content */}
            <div className="relative min-h-[340px] p-8 md:p-12">
              {/* Grid dots */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, #64748b 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Node cards */}
              <div className="relative flex flex-wrap justify-center gap-6 md:gap-8">
                {heroNodes.map((node) => (
                  <div
                    key={node.type}
                    className={`float-anim w-44 rounded-xl border ${node.bg} ${node.border} px-5 py-4 text-left`}
                    style={{ animationDelay: node.delay }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded ${node.iconBg}`}
                      >
                        <node.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wider ${node.labelColor}`}
                      >
                        {node.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-300">
                      {node.title}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {node.score ? (
                        <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                          {node.score}
                        </span>
                      ) : node.meta ? (
                        <>
                          {node.metaColor && (
                            <span
                              className={`h-2 w-2 rounded-full ${node.metaColor}`}
                            />
                          )}
                          <span className="text-xs text-slate-500">
                            {node.meta}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              {/* Connection lines SVG */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                style={{ zIndex: 0 }}
              >
                <line
                  x1="25%"
                  y1="60%"
                  x2="42%"
                  y2="40%"
                  stroke="#4F6EF7"
                  strokeWidth="1"
                  opacity="0.3"
                  className="consolidation-line"
                />
                <line
                  x1="55%"
                  y1="40%"
                  x2="72%"
                  y2="55%"
                  stroke="#4F6EF7"
                  strokeWidth="1"
                  opacity="0.3"
                  className="consolidation-line"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
