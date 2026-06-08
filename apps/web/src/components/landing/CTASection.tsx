import Link from "next/link";

export function CTASection() {
	return (
		<section className="relative overflow-hidden border-t border-zinc-800 bg-zinc-900/50 px-4 py-24">
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
			<div className="relative mx-auto max-w-3xl text-center">
				<h2 className="text-4xl font-bold text-white md:text-5xl">
					Ready to <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">reimagine</span> video editing?
				</h2>
				<p className="mt-4 text-lg text-zinc-400">
					Join thousands of creators using AI to edit faster, tell better stories, and focus on what matters.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
					<Link
						href="/sign-up"
						className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 transition-all"
					>
						Start Free
					</Link>
					<Link
						href="/docs"
						className="rounded-xl border border-zinc-700 bg-zinc-800 px-8 py-3.5 text-base font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
					>
						View Docs
					</Link>
				</div>
				<p className="mt-4 text-xs text-zinc-500">No credit card required. Free tier includes 1 project and basic AI tools.</p>
			</div>
		</section>
	);
}
