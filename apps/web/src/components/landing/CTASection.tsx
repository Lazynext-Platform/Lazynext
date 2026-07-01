/**
 * CTA section — "Start Creating for Free" call-to-action with
 * gradient button on the landing page.
 *
 * @module components/landing/CTASection
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
	return (
		<section className="relative overflow-hidden bg-slate-50 dark:bg-background px-4 py-32 transition-colors duration-300">
			{/* Dramatic Center Gradient Burst */}
			<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400/30 dark:from-blue-600/30 via-indigo-400/10 dark:via-indigo-600/10 to-transparent blur-[80px] pointer-events-none" />

			<div className="relative z-10 mx-auto max-w-3xl text-center">
				<h2 className="text-4xl font-extrabold text-zinc-900 dark:text-foreground md:text-6xl tracking-tight leading-[1.1]">
					Ready to edit
					<br />
					<span className="bg-gradient-to-r from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500 bg-clip-text text-transparent drop-shadow-sm">
						your first video?
					</span>
				</h2>
				<p className="mx-auto mt-6 max-w-xl text-lg text-zinc-600 dark:text-muted">
					Start editing at the speed of thought. Compile your edits instantly
					using deterministic Rust and our AI Copilot.
				</p>

				<div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
					<Link
						href="/sign-up"
						className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-background dark:bg-white px-8 py-4 text-base font-bold text-foreground dark:text-zinc-950 shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] transition-all hover:scale-105 hover:bg-panel dark:hover:bg-zinc-100"
					>
						Start Editing
						<ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
					</Link>
					<Link
						href="/sign-up"
						className="flex w-full sm:w-auto items-center justify-center rounded-xl border border-zinc-200 dark:border-border bg-white/50 dark:bg-hover px-8 py-4 text-base font-medium text-zinc-900 dark:text-foreground backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:hover:bg-glass"
					>
						Create Account
					</Link>
				</div>

				<div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted">
					<div className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
					<span>
						Free tier includes unlimited local rendering and 5 API credits.
					</span>
				</div>
			</div>
		</section>
	);
}
