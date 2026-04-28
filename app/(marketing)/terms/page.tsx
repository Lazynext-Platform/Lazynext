import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Lazynext',
  description: 'Terms governing your use of the Lazynext platform.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service — Lazynext',
    description: 'Terms governing your use of the Lazynext platform.',
    url: '/terms',
  },
}

export default function TermsPage() {
  return (
    <main id="main-content" className="bg-white text-slate-900">
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-24">
        <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-600">Last updated: April 15, 2026</p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-slate-600">
          <section>
            <h2 className="text-xl font-semibold text-slate-900">1. Acceptance of Terms</h2>
            <p className="mt-3">
              By accessing or using Lazynext, you agree to be bound by these Terms of Service. If you do not agree,
              you may not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">2. Account Registration</h2>
            <p className="mt-3">
              You must provide accurate information when creating an account. You are responsible for maintaining
              the security of your account credentials and for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">3. Acceptable Use</h2>
            <p className="mt-3">
              You agree to use Lazynext only for lawful purposes and in accordance with these Terms. You may not
              use the platform to store or transmit malicious code, violate any laws, or infringe on the rights of others.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">4. Billing &amp; Subscriptions</h2>
            <p className="mt-3">
              Paid plans are billed through Gumroad. You can upgrade, downgrade, or cancel at any time.
              Refunds are handled on a case-by-case basis within 30 days of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">5. Data Ownership</h2>
            <p className="mt-3">
              You retain all rights to data you create in Lazynext. We do not claim ownership of your content.
              You can export your data at any time via the workspace settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">6. Termination</h2>
            <p className="mt-3">
              Either party may terminate the agreement at any time. Upon termination, your data will be retained
              for 30 days before permanent deletion, giving you time to export.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900">7. Contact</h2>
            <p className="mt-3">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:legal@lazynext.com" className="font-semibold text-slate-900 underline decoration-brand decoration-2 underline-offset-2 hover:bg-brand/20">
                legal@lazynext.com
              </a>.
            </p>
          </section>
        </div>
      </article>
    </main>
  )
}
