export default function SocialProofBar() {
  return (
    <section className="border-b border-slate-100 py-12">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="mb-8 text-sm font-medium text-slate-400">
          Trusted by 1,200+ teams across 40+ countries
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <div className="h-8 w-24 rounded-full bg-slate-100" />
          <div className="h-8 w-28 rounded-full bg-slate-100" />
          <div className="h-8 w-20 rounded-full bg-slate-100" />
          <div className="h-8 w-32 rounded-full bg-slate-100" />
          <div className="h-8 w-24 rounded-full bg-slate-100" />
          <div className="h-8 w-28 rounded-full bg-slate-100" />
        </div>
      </div>
    </section>
  )
}
