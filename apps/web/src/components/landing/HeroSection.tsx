import Link from "next/link";
import { Sparkles, TerminalSquare, Layers, Wand2 } from "lucide-react";

export function HeroSection() {
	return (
		<section className="relative min-h-[90vh] overflow-hidden bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center transition-colors duration-300">
			{/* Ambient Glowing Background */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400/20 dark:from-blue-900/40 via-slate-50 dark:via-zinc-950 to-slate-50 dark:to-zinc-950" />
			<div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/20 dark:bg-cyan-600/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen pointer-events-none animate-pulse" />
			<div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-[150px] mix-blend-multiply dark:mix-blend-screen pointer-events-none" />
			
			<div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] dark:opacity-[0.04] mix-blend-overlay pointer-events-none" />

			<div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
				{/* Top Status Pill */}
				<div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 backdrop-blur-xl transition-colors hover:bg-zinc-100 dark:hover:bg-white/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
					<span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse" />
					Lazynext Core v0.1.0 Online
				</div>

				{/* Main Headline */}
				<h1 className="text-5xl font-extrabold tracking-tighter text-zinc-900 dark:text-white md:text-7xl lg:text-[5.5rem] leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
					The Agentic
					<br />
					<span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:via-blue-500 dark:to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
						Prompt-to-Edit Platform
					</span>
				</h1>

				{/* Subheadline */}
				<p className="mx-auto mt-8 max-w-3xl text-lg text-zinc-600 dark:text-zinc-400 md:text-xl font-light leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
					Edit video with natural language, not clicks. Your AI Video Editing Copilot unifies 17 enterprise microservices into a single, lightning-fast Rust architecture.
				</p>

				{/* Feature Tags */}
				<div className="mt-8 flex flex-wrap justify-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
					<div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-white/5 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 backdrop-blur-sm">
						<TerminalSquare className="size-4 text-cyan-600 dark:text-cyan-400" />
						<span>Rust WASM Engine</span>
					</div>
					<div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-white/5 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 backdrop-blur-sm">
						<Layers className="size-4 text-indigo-600 dark:text-indigo-400" />
						<span>17 Proprietary Models</span>
					</div>
					<div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-white/5 bg-white/50 dark:bg-white/5 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 backdrop-blur-sm">
						<Wand2 className="size-4 text-amber-500 dark:text-amber-400" />
						<span>NeRFs & Rotoscoping</span>
					</div>
				</div>

				{/* Call to Action Buttons */}
				<div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
					<Link
						href="/sign-up"
						className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-zinc-900 dark:bg-white px-8 py-4 text-base font-bold text-white dark:text-zinc-950 transition-transform hover:scale-105 hover:bg-zinc-800 dark:hover:bg-zinc-100"
					>
						<Sparkles className="size-5 text-blue-400 dark:text-blue-600 transition-transform group-hover:rotate-12" />
						Initialize Project
					</Link>
					<Link
						href="/docs"
						className="flex items-center justify-center rounded-xl border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-8 py-4 text-base font-medium text-zinc-900 dark:text-white backdrop-blur-sm transition-colors hover:bg-zinc-100 dark:hover:bg-white/10"
					>
						Read the Documentation
					</Link>
				</div>
			</div>

			{/* Decorative Bottom Fade */}
			<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 dark:from-zinc-950 to-transparent z-20 pointer-events-none" />
		</section>
	);
}
