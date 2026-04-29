import type { Metadata } from 'next'
import { ApiReferenceClient } from './ApiReferenceClient'

// /docs/api/reference — interactive OpenAPI viewer powered by Scalar.
//
// We render Scalar against the live spec at /api/v1/openapi.json so
// the viewer always reflects what the deployed API actually says.
// Re-deploys propagate within the cache window (300s s-maxage) and
// Scalar fetches fresh on each load.
//
// Why a separate page (not an embed inside /docs/api): the prose
// reference at /docs/api is the curated, human-friendly page. This
// page is the explorer — long-form, full-screen, machine-comprehensive.
//
// SEO: this page is intentionally NOT canonicalized as the API
// reference (that stays /docs/api). It's an `explorer`-style sub-page
// to keep search engines pointed at the prose.

export const metadata: Metadata = {
  title: 'API Explorer — Lazynext',
  description:
    'Interactive OpenAPI explorer for the Lazynext public REST API. Try every endpoint, see schemas, copy-paste curl.',
  alternates: { canonical: '/docs/api/reference' },
  robots: { index: false, follow: true },
}

export default function ApiReferencePage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      {/* Scalar mounts a full UI; we just give it a roomy container. */}
      <div className="mx-auto max-w-7xl px-2 pb-16 pt-6 md:px-6">
        <ApiReferenceClient />
      </div>
    </main>
  )
}
