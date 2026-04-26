import fs from 'node:fs/promises'
import path from 'node:path'

// Real public changelog. Converted from a hardcoded `entries` array (whose
// "Latest" pinned at v1.0.0.0 while production was running v1.3.2.x — every
// prospect saw a stale demo) into a server component that parses the real
// `CHANGELOG.md` at the repo root at request time.
//
// The file is checked into the repo and updated atomically with each
// version bump, so this page is always in sync with the truth.

interface ChangelogItem {
  type: 'feat' | 'fix' | 'perf' | 'chore' | 'docs' | 'refactor' | 'test' | 'style' | 'note'
  text: string
}

interface ChangelogEntry {
  version: string
  date: string
  theme: string | null
  items: ChangelogItem[]
}

// Hot path inputs are tiny (a few KB). No need for caching beyond Next's
// default fetch/fs static optimization.
async function loadChangelog(): Promise<ChangelogEntry[]> {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md')
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    return []
  }

  // Split on top-level "## [version] - date" headings. The Unreleased
  // section uses the same prefix but no date, so we guard against it.
  const lines = raw.split('\n')
  const entries: ChangelogEntry[] = []
  let current: ChangelogEntry | null = null
  let currentSection: string | null = null

  for (const line of lines) {
    const versionMatch = line.match(/^## \[(\d[^\]]*)\][^\d]*(\d{4}-\d{2}-\d{2})/)
    if (versionMatch) {
      if (current) entries.push(current)
      current = { version: versionMatch[1], date: versionMatch[2], theme: null, items: [] }
      currentSection = null
      continue
    }
    if (!current) continue

    // ### Added / Changed / Removed / Fixed / Verification
    const sectionMatch = line.match(/^###\s+(.+)$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim().toLowerCase()
      continue
    }

    // Theme line — first **Theme:** ... paragraph after the heading.
    if (!current.theme) {
      const themeMatch = line.match(/^\*\*Theme:\*\*\s*(.+)$/)
      if (themeMatch) {
        current.theme = themeMatch[1].trim()
        continue
      }
    }

    // List item under a section.
    const itemMatch = line.match(/^-\s+(.+)$/)
    if (itemMatch && currentSection && currentSection !== 'verification') {
      const text = itemMatch[1].trim()
      const type = sectionToType(currentSection)
      // Only first ~120 chars of each item — the full prose lives in CHANGELOG.md
      const trimmed = text.length > 240 ? text.slice(0, 237) + '…' : text
      current.items.push({ type, text: trimmed })
    }
  }
  if (current) entries.push(current)

  return entries
}

function sectionToType(section: string): ChangelogItem['type'] {
  if (section.startsWith('add')) return 'feat'
  if (section.startsWith('chang')) return 'feat'
  if (section.startsWith('fix')) return 'fix'
  if (section.startsWith('remov')) return 'note'
  if (section.startsWith('perf')) return 'perf'
  if (section.startsWith('deprecat')) return 'note'
  if (section.startsWith('security')) return 'fix'
  return 'note'
}

const typeBadge: Record<string, string> = {
  feat: 'bg-emerald-100 text-emerald-700',
  fix: 'bg-amber-100 text-amber-700',
  perf: 'bg-blue-100 text-blue-700',
  note: 'bg-slate-100 text-slate-600',
  chore: 'bg-slate-100 text-slate-600',
  docs: 'bg-slate-100 text-slate-600',
  refactor: 'bg-purple-100 text-purple-700',
  test: 'bg-sky-100 text-sky-700',
  style: 'bg-pink-100 text-pink-700',
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

// Render a single inline-markdown segment to a tree of nodes. Handles `code`,
// **bold**, *em* — the same subset that appears in our changelog entries.
// We intentionally don't pull in a full markdown library for this page.
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const seg = match[0]
    if (seg.startsWith('`')) {
      parts.push(<code key={key++} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-2xs text-slate-700">{seg.slice(1, -1)}</code>)
    } else if (seg.startsWith('**')) {
      parts.push(<strong key={key++} className="font-semibold text-slate-800">{seg.slice(2, -2)}</strong>)
    } else {
      parts.push(<em key={key++}>{seg.slice(1, -1)}</em>)
    }
    last = re.lastIndex
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export const revalidate = 300 // 5 minutes — changelog updates land via deploy

export default async function ChangelogPage() {
  const entries = await loadChangelog()
  // Cap at the latest 12 versions so the page stays scannable.
  const visible = entries.slice(0, 12)

  return (
    <main id="main-content" className="bg-white text-slate-900">
      <section className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        <span className="inline-block rounded-full bg-lime-100 px-4 py-1 text-xs font-semibold text-lime-700">Changelog</span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">What&apos;s new in Lazynext</h1>
        <p className="mt-2 text-lg text-slate-600">
          Every release that has shipped. Pulled live from the repo&apos;s <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-sm">CHANGELOG.md</code>.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No changelog entries are available right now. Check back after the next release.
          </div>
        ) : (
          <div className="relative ml-4 border-l-2 border-slate-200 pl-8 space-y-12">
            {visible.map((entry, idx) => (
              <div key={entry.version} className="relative">
                <div className="absolute -left-[41px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
                  <div className={`h-2.5 w-2.5 rounded-full ${idx === 0 ? 'bg-lime-500' : 'bg-slate-300'}`} />
                </div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h3 className="text-lg font-bold">v{entry.version}</h3>
                  <time dateTime={entry.date} className="text-sm text-slate-500">{formatDate(entry.date)}</time>
                  {idx === 0 && (
                    <span className="rounded-full bg-lime-100 px-2 py-0.5 text-2xs font-semibold text-lime-700">Latest</span>
                  )}
                </div>
                {entry.theme && (
                  <p className="mb-3 text-sm leading-relaxed text-slate-700">{renderInline(entry.theme)}</p>
                )}
                {entry.items.length > 0 && (
                  <ul className="space-y-2">
                    {entry.items.slice(0, 8).map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-2xs font-bold uppercase ${typeBadge[item.type] || typeBadge.note}`}>
                          {item.type}
                        </span>
                        <span className="text-sm text-slate-600 leading-relaxed">{renderInline(item.text)}</span>
                      </li>
                    ))}
                    {entry.items.length > 8 && (
                      <li className="text-2xs text-slate-400 pl-1">
                        + {entry.items.length - 8} more — see the full <a href="https://github.com/Lazynext-Platform/Lazynext/blob/main/CHANGELOG.md" className="underline hover:text-slate-600" target="_blank" rel="noreferrer">CHANGELOG.md</a>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {entries.length > visible.length && (
          <p className="mt-12 text-center text-xs text-slate-500">
            Showing the {visible.length} most recent of {entries.length} releases.
            <a href="https://github.com/Lazynext-Platform/Lazynext/blob/main/CHANGELOG.md" className="ml-1 font-medium text-slate-700 underline hover:no-underline" target="_blank" rel="noreferrer">
              View the full history
            </a>.
          </p>
        )}
      </section>
    </main>
  )
}
