import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Lazynext',
  description: 'How Lazynext collects, uses, and protects your data.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy — Lazynext',
    description: 'How Lazynext collects, uses, and protects your data.',
    url: '/privacy',
  },
}

export default function PrivacyPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-600">Last updated: April 15, 2026</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-slate-600">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Information We Collect</h2>
            <p className="mt-3">
              We collect information you provide directly: your name, email address, workspace data, and usage patterns
              within Lazynext. We also automatically collect device information, IP addresses, and browser type through
              standard web technologies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. How We Use Your Information</h2>
            <p className="mt-3">
              Your data powers your workspace experience — tasks, decisions, docs, and AI features. We use aggregated,
              anonymized data to improve our product. We never sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Data Storage &amp; Security</h2>
            <p className="mt-3">
              All data is stored in Supabase-managed PostgreSQL databases with encryption at rest and in transit.
              We follow industry-standard security practices including regular audits and access controls.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Third-Party Services</h2>
            <p className="mt-3">
              We use Supabase (authentication &amp; database), Gumroad (payments), and Resend (transactional email).
              Each service has its own privacy policy and processes data according to their terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Your Rights</h2>
            <p className="mt-3">
              You can access, update, or delete your data at any time from your workspace settings. For account
              deletion requests or data export, contact us at{' '}
              <a href="mailto:security@lazynext.com" className="font-semibold text-slate-900 underline decoration-brand decoration-2 underline-offset-2 hover:bg-brand/20">
                security@lazynext.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Contact</h2>
            <p className="mt-3">
              Questions about this policy? Reach us at{' '}
              <a href="mailto:security@lazynext.com" className="font-semibold text-slate-900 underline decoration-brand decoration-2 underline-offset-2 hover:bg-brand/20">
                security@lazynext.com
              </a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
