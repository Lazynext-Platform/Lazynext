import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import type { Metadata } from 'next'

type Post = {
  slug: string
  title: string
  excerpt: string
  date: string
  dateTime: string
  tag: string
  content: Array<{ type: 'p' | 'h2' | 'h3' | 'ul' | 'blockquote' | 'code'; text?: string; items?: string[]; lang?: string }>
}

const posts: Record<string, Post> = {
  'launching-lazynext': {
    slug: 'launching-lazynext',
    title: 'Lazynext is live, and we think we shipped the thing PM tools forgot',
    excerpt: 'Every decision your team makes is now a scored, tracked, reviewed object. Here\u2019s why that matters more than another Kanban board.',
    date: 'April 18, 2026',
    dateTime: '2026-04-18',
    tag: 'Launch',
    content: [
      { type: 'p', text: 'Here\u2019s the uncomfortable thing about running a team.' },
      { type: 'p', text: 'You don\u2019t get paid for the tasks you complete. You get paid for the decisions you make. The hire. The architecture choice. The feature cut. Every one of those decisions costs or compounds for months.' },
      { type: 'p', text: 'And yet your decisions live in Slack threads that age out in three weeks, in meeting notes nobody reads, in the head of whoever was in the room. The outcome lands six months later and nobody goes back to ask "did we reason about this well, or did we get lucky?"' },
      { type: 'p', text: 'We built Lazynext because we were tired of this.' },
      { type: 'h2', text: 'The thesis' },
      { type: 'p', text: 'A team\u2019s ability to make good decisions is its most valuable compounding asset. And almost nobody measures it. So we made decisions a first-class object, and we made an LLM grade them.' },
      { type: 'h2', text: 'Decision DNA: 4 dimensions' },
      { type: 'p', text: 'Every decision in Lazynext gets scored on four equally weighted dimensions, 0 to 100 each:' },
      { type: 'ul', items: [
        'Clarity — is the question sharp, or a vague vibe?',
        'Data quality — is the rationale grounded in evidence or in guesses?',
        'Risk awareness — does it name the downside, the reversibility, the stakes?',
        'Alternatives considered — what did you seriously weigh, and what did you reject?',
      ]},
      { type: 'p', text: 'Primary model is Groq\u2019s Llama 3.3 70B. Together AI is the fallback. If both fail, a deterministic heuristic takes over so scoring never blocks a decision from being logged. Every score is stamped with the model version. Look back in a year and you\u2019ll know which model judged what.' },
      { type: 'h2', text: 'The outcome loop is the point' },
      { type: 'p', text: 'A scored decision without a tracked outcome is a prettier diary. So every decision has an expected_by field. A daily Inngest job finds decisions past their date and emails the author. "Hey, you said you\u2019d know in 30 days. It\u2019s been 30 days. What happened?" You tag the outcome. The decision gets a retrospective. Over time you see which categories your team wins at, which ones you fumble, and who has calibrated judgment versus who is guessing.' },
      { type: 'h2', text: 'Public decision pages' },
      { type: 'p', text: 'Any decision can be shared at /d/[slug] with full OG metadata. Post it in the RFC channel. The quarterly review. Twitter. The scoring makes the reasoning legible even to people who weren\u2019t in the room. This is the thing every eng org has been faking with Google Docs for a decade.' },
      { type: 'h2', text: 'Workspace Maturity Score' },
      { type: 'p', text: 'Most workflow tools give you 20 features on day one and hope you figure it out. We do the opposite. New workspaces get decisions and outcomes only. As you actually decide things, a score grows in the background and unlocks more: tasks and threads at 15 points, docs and tables at 35, the full canvas and automations at 60. Power user who wants everything immediately? One toggle. Default bias: earn the complexity.' },
      { type: 'h2', text: 'What shipped' },
      { type: 'ul', items: [
        '38 features, all designed and built',
        '72 polish commits after feature freeze',
        '20 new tests in this release, on top of the existing suite',
        'WCAG 2.1 AA across the entire app',
        '40 locales, 57 currencies, global billing via Gumroad',
        'Rate limiting on every API route, error boundaries on every page',
      ]},
      { type: 'h2', text: 'What didn\u2019t, and why' },
      { type: 'ul', items: [
        'Real-time collaboration cursors are plumbed but not battle-tested. Q3.',
        'Native mobile isn\u2019t a product question, it\u2019s a distribution question. Not yet.',
        'Self-hosted exists in the code but the support model doesn\u2019t. Email us.',
      ]},
      { type: 'h2', text: 'Try it' },
      { type: 'p', text: 'We built a dev auth bypass so you can walk the entire UI without a database.' },
      { type: 'code', lang: 'bash', text: 'git clone https://github.com/Lazynext-Platform/Lazynext.git\ncd Lazynext\nnpm install --legacy-peer-deps\nnpm run dev' },
      { type: 'p', text: 'Set GROQ_API_KEY to see the AI scorer. Without it, the heuristic path still runs, still useful, just not AI.' },
      { type: 'p', text: 'If your team makes a lot of decisions and has no way to know if it\u2019s getting better at them, we want to talk to you. hello@lazynext.com.' },
      { type: 'p', text: 'Go decide something good. Then come back and see if you did.' },
    ],
  },
}

const tagColors: Record<string, string> = {
  Product: 'bg-indigo-100 text-indigo-700',
  Engineering: 'bg-emerald-100 text-emerald-700',
  Company: 'bg-amber-100 text-amber-700',
  Launch: 'bg-pink-100 text-pink-700',
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(posts).map(slug => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = posts[params.slug]
  if (!post) return { title: 'Post not found' }
  return {
    title: `${post.title} | Lazynext Blog`,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.dateTime },
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = posts[params.slug]
  if (!post) notFound()

  return (
    <main id="main-content" className="bg-white text-slate-900">
      <article className="mx-auto max-w-3xl px-6 pt-24 pb-24">
        <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          <ArrowLeft className="h-3.5 w-3.5" /> All posts
        </Link>

        <header className="mt-6">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${tagColors[post.tag] || 'bg-slate-100 text-slate-500'}`}>{post.tag}</span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="h-3 w-3" />
              <time dateTime={post.dateTime}>{post.date}</time>
            </span>
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight leading-tight">{post.title}</h1>
          <p className="mt-3 text-lg text-slate-600 leading-relaxed">{post.excerpt}</p>
        </header>

        <div className="mt-10 space-y-5 text-slate-700 leading-relaxed">
          {post.content.map((block, i) => {
            if (block.type === 'h2') return <h2 key={i} className="text-2xl font-bold text-slate-900 pt-4">{block.text}</h2>
            if (block.type === 'h3') return <h3 key={i} className="text-lg font-bold text-slate-900 pt-2">{block.text}</h3>
            if (block.type === 'ul') return (
              <ul key={i} className="list-disc pl-6 space-y-2">
                {block.items?.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            )
            if (block.type === 'code') return (
              <pre key={i} className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-mono text-slate-800">
                <code>{block.text}</code>
              </pre>
            )
            if (block.type === 'blockquote') return <blockquote key={i} className="border-l-4 border-indigo-200 pl-4 italic text-slate-600">{block.text}</blockquote>
            return <p key={i}>{block.text}</p>
          })}
        </div>

        <footer className="mt-16 rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-6">
          <h3 className="text-lg font-bold">Start measuring your team&rsquo;s judgment.</h3>
          <p className="mt-1 text-sm text-slate-600">If your team makes a lot of decisions and has no way to know if it&rsquo;s getting better at them, we want to talk.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/sign-up" className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Get started</Link>
            <Link href="/contact" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-200">Contact us</Link>
          </div>
        </footer>
      </article>
    </main>
  )
}
