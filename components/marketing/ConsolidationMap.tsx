import { ArrowRight, ArrowDown } from 'lucide-react'

export default function ConsolidationMap() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-[1280px] px-6 text-center">
        <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          One tool.{' '}
          <span className="text-brand">One price.</span>
        </h2>
        <p className="mx-auto mb-16 max-w-xl text-lg text-slate-500">
          Stop paying six subscriptions for six half-solutions.
        </p>

        <div className="mx-auto max-w-3xl">
          <svg
            className="w-full"
            viewBox="0 0 800 300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Diagram showing 6 tools (Notion, Jira, Slack, Google Docs, Miro, Confluence) consolidating into Lazynext"
          >
            {/* Tool boxes */}
            <rect x="20" y="20" width="100" height="40" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="70" y="45" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="Inter" fontWeight="600">Notion</text>

            <rect x="20" y="75" width="100" height="40" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="70" y="100" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="Inter" fontWeight="600">Linear</text>

            <rect x="20" y="130" width="100" height="40" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="70" y="155" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="Inter" fontWeight="600">Trello</text>

            <rect x="20" y="185" width="100" height="40" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="70" y="210" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="Inter" fontWeight="600">Slack</text>

            <rect x="20" y="240" width="100" height="40" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="70" y="265" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="Inter" fontWeight="600">Zapier</text>

            <rect x="160" y="240" width="100" height="40" rx="8" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x="210" y="265" textAnchor="middle" fill="#64748b" fontSize="13" fontFamily="Inter" fontWeight="600">Sheets</text>

            {/* Animated lines */}
            <line x1="120" y1="40" x2="540" y2="150" stroke="#4F6EF7" strokeWidth="1.5" opacity="0.3" className="consolidation-line" />
            <line x1="120" y1="95" x2="540" y2="150" stroke="#4F6EF7" strokeWidth="1.5" opacity="0.3" className="consolidation-line" />
            <line x1="120" y1="150" x2="540" y2="150" stroke="#4F6EF7" strokeWidth="1.5" opacity="0.3" className="consolidation-line" />
            <line x1="120" y1="205" x2="540" y2="150" stroke="#4F6EF7" strokeWidth="1.5" opacity="0.3" className="consolidation-line" />
            <line x1="120" y1="260" x2="540" y2="150" stroke="#4F6EF7" strokeWidth="1.5" opacity="0.3" className="consolidation-line" />
            <line x1="260" y1="260" x2="540" y2="150" stroke="#4F6EF7" strokeWidth="1.5" opacity="0.3" className="consolidation-line" />

            {/* Lazynext box */}
            <rect x="540" y="110" width="220" height="80" rx="16" fill="#4F6EF7" stroke="#3B5AE0" strokeWidth="2" />
            <text x="650" y="147" textAnchor="middle" fill="white" fontSize="20" fontFamily="Inter" fontWeight="800">Lazynext</text>
            <text x="650" y="170" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="12" fontFamily="Inter" fontWeight="500">Everything. One place.</text>
          </svg>
        </div>

        {/* Price comparison */}
        <div className="mt-12 flex flex-col items-center justify-center gap-8 sm:flex-row">
          <div className="text-center">
            <p className="text-4xl font-extrabold text-slate-300 line-through">
              $171
            </p>
            <p className="mt-1 text-sm text-slate-400">
              /seat/month (6 tools)
            </p>
          </div>
          <div>
            <ArrowRight className="hidden h-8 w-8 text-brand sm:inline-block" />
            <ArrowDown className="h-8 w-8 text-brand sm:hidden" />
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold text-brand">$19</p>
            <p className="mt-1 text-sm text-slate-500">
              /seat/month (1 tool)
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
