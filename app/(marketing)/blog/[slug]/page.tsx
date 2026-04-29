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
  'how-decision-dna-scoring-works': {
    slug: 'how-decision-dna-scoring-works',
    title: 'How Decision DNA actually scores a decision',
    excerpt: 'Four dimensions, two LLM providers, one deterministic fallback, and a stamped model version on every score. The complete pipeline, including what fails.',
    date: 'April 22, 2026',
    dateTime: '2026-04-22',
    tag: 'Engineering',
    content: [
      { type: 'p', text: 'When you log a decision in Lazynext, four numbers come back: clarity, data quality, risk awareness, alternatives considered. Each is 0–100. They\u2019re weighted equally and rounded into a single overall score. That sounds simple. The pipeline behind it had to survive three things every LLM-backed feature has to survive eventually: the model goes down, the model returns garbage, and the bill is open-ended.' },
      { type: 'h2', text: 'The four dimensions' },
      { type: 'p', text: 'We picked the dimensions to be orthogonal — a decision can score high on clarity and low on data quality, and that\u2019s a real signal, not a measurement artefact. The prompt asks the model to grade each dimension independently with a one-sentence rationale, then we aggregate them ourselves so the model never sees the overall score it\u2019s indirectly producing.' },
      { type: 'ul', items: [
        'Clarity — is the question sharp, falsifiable, scoped? "Should we hire?" is 20. "Should we hire a second senior backend engineer in Q3?" is 80.',
        'Data quality — is the rationale grounded in evidence (numbers, customer quotes, logs) or in vibes? Vibes are not zero, but they\u2019re not 80 either.',
        'Risk awareness — does it name the downside, the reversibility, the blast radius? "We can roll this back in a sprint" earns more than silence.',
        'Alternatives considered — what was seriously weighed and rejected, and why? An empty `options_considered[]` caps this dimension hard.',
      ]},
      { type: 'h2', text: 'The provider chain' },
      { type: 'p', text: 'Primary is Groq running Llama 3.3 70B. We chose it because the round-trip is consistently under 800ms, which means we can score on the keystroke that closes the modal without a spinner that screams "AI is happening." Together AI is the fallback for when Groq\u2019s region is degraded. If both fail — including the wonderful failure mode where the model returns valid JSON wrapped in markdown fences with prose before and after it — a deterministic heuristic takes over so scoring never blocks the decision from being logged.' },
      { type: 'h2', text: 'JSON wrangling, the unglamorous part' },
      { type: 'p', text: 'Llama via Groq routinely ignores "respond with raw JSON only" and wraps the response in fenced code blocks, sometimes with a friendly preamble. So we have a small `extractJson` step that strips fences, then grabs everything from the first `{` to the last `}`, then parses. If parsing fails, the call is logged as `fallback_cause: "json_parse_failed"` and the heuristic runs. We watch the rate of that cause as a model-quality canary — when Llama 3.3 first dropped, that line in our logs spiked for 36 hours, then settled.' },
      { type: 'code', lang: 'ts', text: 'function extractJson(raw: string): string {\n  let s = raw.trim()\n  if (s.startsWith("```")) {\n    s = s.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "")\n  }\n  const first = s.indexOf("{")\n  const last = s.lastIndexOf("}")\n  if (first !== -1 && last !== -1 && last > first) {\n    s = s.slice(first, last + 1)\n  }\n  return s.trim()\n}' },
      { type: 'h2', text: 'The heuristic that runs when AI doesn\u2019t' },
      { type: 'p', text: 'The fallback is dumb on purpose. It looks at length signals (rationale character count, question length), counts entries in `options_considered`, and flags risk awareness if the rationale contains the word "revers" or `risk_notes` is non-empty or `decision_type === "experimental"`. It produces scores in the right shape so downstream consumers (the health dashboard, outcome review, public decision pages) don\u2019t have to know which path produced the score. They just have to look at `source` and `model_version`.' },
      { type: 'h2', text: 'Every score is stamped' },
      { type: 'p', text: 'Look back in a year and you should know which model judged what. Every row stores the `model_version` (e.g. `groq:llama-3.3-70b-v2`, or `heuristic:v1`) plus the `source` (`ai` or `heuristic`). When we eventually swap the primary model, the dashboard will let you filter by version so you can audit "did our average clarity score actually rise, or did the new model just grade nicer?" That second question is going to come up at every team that takes this seriously.' },
      { type: 'h2', text: 'What we log on every call' },
      { type: 'p', text: 'A single-line JSON event per score: source, provider, model_version, duration_ms, fallback_cause if any, error message if any. Prefixed with `decision_scorer` so a `grep` in Vercel logs is the entire dashboard. We alert on two things: a spike in `source: heuristic` where `fallback_cause != "no_ai_keys"` (which means real AI calls are failing), and a p95 duration over 2s (which means we\u2019re about to need a second fallback region).' },
      { type: 'h2', text: 'What this is not' },
      { type: 'p', text: 'It is not a verdict on whether the decision was right. The outcome loop does that, weeks or months later. The score is a verdict on whether the reasoning was good enough to be worth tracking — and a calibration anchor when you compare it to the eventual outcome. A clarity-90 decision that flopped is more interesting than a clarity-30 decision that flopped, because it tells you the team is reasoning well and the world is harder than the reasoning suggested. That\u2019s the gap good orgs close.' },
      { type: 'h2', text: 'Try it' },
      { type: 'p', text: 'Set `GROQ_API_KEY` in your env and the AI path lights up. Without one, the heuristic still produces honest, deterministic scores. We deliberately keep the no-keys path useful so a fresh clone of the repo demos the loop without needing a billing relationship with a model provider.' },
    ],
  },
  'workspace-maturity-score': {
    slug: 'workspace-maturity-score',
    title: 'Workspace Maturity Score: why we hide most of the product on day one',
    excerpt: 'Most workflow tools dump 20 features on you and hope. We unlock features as you actually decide things. Here\u2019s the math, the events, and why the default bias is "earn the complexity."',
    date: 'April 25, 2026',
    dateTime: '2026-04-25',
    tag: 'Product',
    content: [
      { type: 'p', text: 'A new Lazynext workspace doesn\u2019t look like Lazynext. There\u2019s no canvas, no automations, no tables, no docs. There are decisions and outcomes. That\u2019s it.' },
      { type: 'p', text: 'This is deliberate, and it\u2019s the single most contested product decision we\u2019ve made.' },
      { type: 'h2', text: 'The score, in full' },
      { type: 'p', text: 'Every workspace has a hidden integer called `wms_score`, clamped 0–100. It bumps when you do real things in the product. There are five events, each weighted by how much signal they carry about a team that\u2019s actually using the product the way it\u2019s meant to be used:' },
      { type: 'ul', items: [
        'decision_created: +2',
        'outcome_recorded: +3 (the loop closing is more valuable than opening it)',
        'teammate_invited: +5 (a single-player workspace caps out fast — we want this to bump hardest)',
        'decision_public_shared: +2',
        'integration_connected: +4',
      ]},
      { type: 'h2', text: 'Four layers, four thresholds' },
      { type: 'p', text: 'The score maps to one of four layers, and each layer unlocks a slice of the product:' },
      { type: 'ul', items: [
        'Layer 1 (0–14): Decisions and outcomes only. The product is two screens.',
        'Layer 2 (15–34): Tasks and threads unlock — you can now coordinate around the decisions you\u2019re making.',
        'Layer 3 (35–59): Docs and tables unlock — the workspace is now a real reference surface, not just a decision log.',
        'Layer 4 (60+): The full canvas, automations, and integrations unlock. This is where Lazynext looks like the marketing site shows it.',
      ]},
      { type: 'p', text: 'A team that invites three colleagues, logs ten decisions, records two outcomes, and shares one decision publicly hits Layer 4 in a single afternoon. A team that opens the product, pokes around, and closes the tab never gets past Layer 1. We think both outcomes are correct.' },
      { type: 'h2', text: 'Why this is unpopular and why we kept it' },
      { type: 'p', text: 'The standard objection: "I want to see what I\u2019m paying for." Fair. So we shipped a single toggle in workspace settings called Power user mode. Flip it and every layer unlocks regardless of score. We default it off.' },
      { type: 'p', text: 'The reason we default it off: the highest-churn pattern in workflow software is the 90-day signup who never logged a single decision because they spent the first two weeks customizing views, building automations, and configuring integrations against an empty database. They built infrastructure for work that never showed up. The score-gate forces the early loop to be the work itself, not the configuration.' },
      { type: 'h2', text: 'How the gate enforces itself' },
      { type: 'p', text: 'Two layers of enforcement. The sidebar and command palette both call `isFeatureUnlocked(feature, score, powerUserOverride)` before rendering — if the feature is locked, it\u2019s not in the menu. That\u2019s the soft gate. The hard gate is at the API level: routes that create locked node types check the same function server-side and return 402 if you somehow craft the request anyway. (You can; we don\u2019t hide it; the locked surface just doesn\u2019t advertise itself.)' },
      { type: 'h2', text: 'The unlock moment' },
      { type: 'p', text: 'When a layer threshold is crossed, the next time you load the workspace home you get a small toast: "You unlocked Tasks and Threads. They\u2019re in the sidebar now." Nothing else changes — no celebration animation, no upsell. The product treats the unlock as a fact of the team\u2019s growth, not a reward for engagement-hacking. We tested the celebratory version. It read as condescending. We took it out.' },
      { type: 'h2', text: 'What this gives up' },
      { type: 'p', text: 'A real loss: the screenshot-driven evaluation. A prospect lands, signs up, and wants to see the canvas. They get an empty decisions screen instead. That\u2019s a real conversion cost we\u2019ve eaten. The compensating bet is that teams who bounce because of this would have churned in week 3 anyway, and teams who stay through Layer 1 are roughly 4x more likely to still be active at day 90. The data on this is early but the gap is wide enough that we\u2019re running with it.' },
      { type: 'h2', text: 'What it gives back' },
      { type: 'p', text: 'A workspace at Layer 4 looks the way it does because the team got there. Every tile in the canvas, every automation rule, every integration is downstream of decisions that were actually made and outcomes that were actually recorded. The complexity is earned. That\u2019s the only reason we trust it not to rot.' },
      { type: 'h2', text: 'The override, plainly' },
      { type: 'p', text: 'Settings → Workspace → "Show me everything from the start." One click. We don\u2019t hide it, we don\u2019t guilt you, we don\u2019t require you to confirm. If you\u2019re an experienced user who knows what you want, the gate is two seconds out of your life. The default is the only opinion we\u2019re defending here.' },
    ],
  },
  'instrumenting-the-api': {
    slug: 'instrumenting-the-api',
    title: 'The week we instrumented the API and stopped guessing',
    excerpt: 'Sentry on every v1 route, per-device session list backed by SECURITY DEFINER RPCs, auto-generated SDK types, a Scalar OpenAPI explorer, and the first OAuth adapter \u2014 all in one push. Notes from the release.',
    date: 'April 28, 2026',
    dateTime: '2026-04-28',
    tag: 'Engineering',
    content: [
      { type: 'p', text: 'Most of what we shipped this week is invisible. No new screens to screenshot, no new node types on the canvas, no marketing copy to write. What changed is the floor under everything else: the API now reports its own errors, the SDK types itself, the OpenAPI document is browsable, every active session is visible to its owner, and the first third-party OAuth flow is wired end-to-end. Six small features that, taken together, mean we stop guessing what the platform is doing.' },
      { type: 'h2', text: 'Sentry on every /api/v1 route' },
      { type: 'p', text: 'For the first six months we relied on logs to know when an API call had failed. Logs are fine until you have a hundred routes and a long tail of intermittent issues. So we wrote one helper, `reportApiError(err, ctx)`, and made it the only sanctioned way to capture exceptions inside the v1 surface. It tags every event with `surface=api/v1`, the route path, the HTTP method, the request id, the workspace id, and the user id, then calls `captureException`. The whole thing is wrapped in its own try/catch \u2014 observability is never allowed to break the request path.' },
      { type: 'p', text: 'The interesting bit isn\u2019t the helper. It\u2019s the discipline of having exactly one helper. We grep for `Sentry.captureException` and the only hit is inside `reportApiError`. That means a route author can\u2019t accidentally forget to attach the request id, can\u2019t accidentally leak a stack trace into the response body, and can\u2019t accidentally double-report. The Sentry config itself is a no-op without `SENTRY_DSN` set, which keeps local dev quiet.' },
      { type: 'h2', text: 'Per-device sessions, with a kill switch' },
      { type: 'p', text: 'Profile \u2192 Sessions used to be an honest empty state with the words "Coming soon." That\u2019s now a real list of every active session for the current user, with device, browser, IP, last-seen-at, and a Revoke button on each row. The current session is marked "This device" and can\u2019t be revoked from itself \u2014 you sign out instead.' },
      { type: 'p', text: 'The implementation is two SECURITY DEFINER Postgres functions: `list_user_sessions(uuid)` and `revoke_user_session(uuid, uuid)`. Both `SET search_path = pg_catalog, public` and are granted to `service_role` only. The route layer checks that the session id being revoked belongs to the calling user before invoking the RPC; the RPC checks again. Two checks for a destructive operation is the right number.' },
      { type: 'p', text: 'The thing we did not do: build our own session table. Supabase already tracks active sessions in the auth schema. Mirroring that into our own table would have been a synchronization bug waiting to happen. Reading directly via SECURITY DEFINER is one less moving part.' },
      { type: 'h2', text: 'Auto-generated SDK types' },
      { type: 'p', text: 'The public SDK lives in `packages/sdk/`. Until this week, the request and response shapes were hand-written TypeScript that drifted from the real API every time a route changed. The fix was a single npm script: `sdk:generate-types` runs `openapi-typescript` against the in-process OpenAPI document and writes `packages/sdk/src/types.ts`. The file is 38 KB of `paths`, `components`, and `operations` interfaces, and it\u2019s checked in so consumers don\u2019t need to run code generation. We re-export it from the SDK\u2019s entry point.' },
      { type: 'p', text: 'The script is idempotent and offline \u2014 it doesn\u2019t hit the running server, it imports `buildOpenApiSpec` from the same module the `/api/v1/openapi.json` route uses. That means CI can regenerate types and diff the result, and any drift is a failed PR check rather than a Slack message six weeks later.' },
      { type: 'h2', text: 'A real OpenAPI explorer at /docs/api/reference' },
      { type: 'p', text: 'We already had a Markdown reference at `/docs/api/reference` \u2014 useful, but flat. The new `/docs/api/reference` page mounts Scalar\u2019s React API reference component pointed at `/api/v1/openapi.json`, with the modern layout and a curl-first code sample. You can browse every endpoint, see the schema for every request and response, and "Try it out" against your own workspace from the page itself. The route is `noindex` because the canonical reference is still the structured docs.' },
      { type: 'p', text: 'There\u2019s a build-time warning about a transitive web-worker dependency in the Scalar bundle. We read the warning, decided it doesn\u2019t affect the page in production, and shipped it anyway. Half of engineering is knowing which warnings to act on and which to leave alone.' },
      { type: 'h2', text: 'The first OAuth adapter' },
      { type: 'p', text: 'The OAuth scaffolding has been in for a few releases \u2014 a registry, a token-envelope encryption helper, a database table, a 501 stub on the start route. This week the start route became a real authorize-redirect, the callback route went in, and we landed the first concrete adapter: GitHub. Read scope is `read:user user:email`, write adds `public_repo`. PKCE is off because GitHub\u2019s web flow uses a client secret. The adapter exchanges the code for a token, calls the user endpoint to capture the external id and display name, and hands the envelope back to the callback route, which encrypts it and upserts into `oauth_connections`.' },
      { type: 'p', text: 'The callback route is the part most worth reading. It verifies the CSRF state cookie, re-checks workspace membership (the user\u2019s permissions could have changed between redirect and callback), reports any failure to Sentry with a phase tag (`exchange`, `seal`, `upsert`), and redirects back to Settings \u2192 Integrations with either `?oauth_connected=github` or `?oauth_error=<code>`. The user never sees a stack trace. The cookie is cleared on every exit, success or failure, so a stale state can\u2019t poison the next attempt.' },
      { type: 'p', text: 'Without `LAZYNEXT_OAUTH_GITHUB_CLIENT_ID` and `LAZYNEXT_OAUTH_GITHUB_CLIENT_SECRET` set, the start route 503s with the env names you need to set. With both set and a registered GitHub OAuth app pointing at `/api/v1/oauth/github/callback`, the entire flow works.' },
      { type: 'h2', text: 'Tests colocated with the package they test' },
      { type: 'p', text: 'A small one, but it\u2019s been bothering us for a while: the SDK client tests lived in `tests/unit/`, away from the SDK itself. We moved them to `packages/sdk/src/client.test.ts` and updated `vitest.config.ts` to include `packages/*/src/**/*.test.{ts,tsx}`. Now the package is self-contained \u2014 anyone vendoring `packages/sdk` gets the tests with it. The full suite is 370 passing.' },
      { type: 'h2', text: 'What\u2019s next' },
      { type: 'p', text: 'The OAuth path now exists end-to-end, but only one provider speaks it. Linear, Notion, and Slack are the next three, in that order, and each one is a copy of the GitHub adapter with provider-specific scopes and a different user endpoint. The Settings \u2192 Integrations page can finally render real connections, the Import Modal can finally pull from real sources, and the Sessions page can finally show what was always there.' },
      { type: 'p', text: 'Six features, no new screens, fewer unknowns. Worth the week.' },
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
            <span className="flex items-center gap-1 text-xs text-slate-600">
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
