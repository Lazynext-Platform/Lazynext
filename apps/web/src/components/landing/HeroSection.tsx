import Link from "next/link";

export function HeroSection() {
	return (
		<section className="relative overflow-hidden px-4 pb-16 pt-24 md:pb-24 md:pt-32">
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/30 via-zinc-950 to-zinc-950" />
			<div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
			<div className="relative mx-auto max-w-4xl text-center">
				<div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5">
					<span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
					<span className="text-xs font-medium text-blue-400">Now with Next.js 16.2.7 + Turbopack</span>
				</div>
				<h1 className="text-5xl font-extrabold tracking-tight text-white md:text-7xl">
					AI Video Editing,
					<br />
					<span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent">
						Reimagined
					</span>
				</h1>
				<p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 md:text-xl">
					Describe your vision in words. Our multi-model AI agent mutates the timeline using deterministic Rust tooling.
					No timeline dragging. Just tell it what you want.
				</p>
				<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
					<Link
						href="/sign-up"
						className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 transition-all"
					>
						Get Started Free
					</Link>
					<Link
						href="/sign-in"
						className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-8 py-3.5 text-base font-medium text-zinc-300 hover:bg-zinc-700 transition-colors backdrop-blur-sm"
					>
						Sign In
					</Link>
				</div>
			</div>
		</section>
	);
}
