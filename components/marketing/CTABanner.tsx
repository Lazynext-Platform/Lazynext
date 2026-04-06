import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function CTABanner() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#4F6EF7] px-8 py-16 text-center md:py-20">
          {/* Decorative blur elements */}
          <div className="absolute left-0 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Ready to stop switching apps?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
              Join 1,200+ teams who consolidated their stack and started
              shipping faster.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex items-center rounded-xl bg-white px-8 py-4 text-base font-bold text-[#4F6EF7] shadow-lg transition-colors hover:bg-slate-50"
            >
              Start Free &mdash; No credit card required
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
