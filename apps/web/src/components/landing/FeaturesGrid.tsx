/**
 * Features grid — animated card grid showcasing core platform
 * capabilities on the landing page.
 *
 * @module components/landing/FeaturesGrid
 */

import {
	Activity,
	Database,
	Braces,
	Code2,
	ShieldCheck,
	Zap,
} from "lucide-react";

/** React component rendering FeaturesGrid. */
export function FeaturesGrid() {
	return (
		<section className="relative overflow-hidden bg-[var(--bg-main)] dark:bg-background px-4 py-24 transition-colors duration-300">
			<div className="mx-auto max-w-6xl">
				<div className="mb-20 text-center">
					<h2 className="text-3xl font-extrabold text-[var(--text-primary)] dark:text-foreground md:text-5xl">
						Built for absolute scale.
					</h2>
					<p className="mt-4 text-lg text-[var(--text-muted)] dark:text-muted">
						We abandoned the slow Javascript timeline. Every core operation runs
						in a highly optimized Rust WASM container.
					</p>
				</div>

				{/* Bento Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:auto-rows-[300px]">
					{/* Bento Item 1: Large Feature */}
					<div className="md:col-span-2 group relative overflow-hidden rounded-3xl bg-[var(--bg-panel)] dark:bg-background/50 p-8 border border-[var(--border-glass)] dark:border-border transition-colors hover:border-zinc-300 dark:hover:border-border hover:bg-[var(--bg-hover)] dark:hover:bg-background/80 shadow-sm dark:shadow-none">
						<div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-10 group-hover:opacity-[0.06] dark:group-hover:opacity-20 transition-opacity">
							<Zap className="size-32 text-amber-500" />
						</div>
						<div className="relative z-10 flex h-full flex-col justify-end">
							<div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-1 text-amber-600 dark:text-amber-500 w-fit">
								<Activity className="size-4" />
								<span className="text-sm font-semibold">Performance</span>
							</div>
							<h3 className="text-2xl font-bold text-[var(--text-primary)] dark:text-foreground mb-2">
								Sub-millisecond Compositor
							</h3>
							<p className="text-[var(--text-muted)] dark:text-muted max-w-md leading-relaxed">
								Our completely custom timeline engine is built entirely in Rust
								using wgpu. It bypasses standard DOM limitations to deliver
								native-level rendering speeds directly in the browser.
							</p>
						</div>
					</div>

					{/* Bento Item 2: Vertical Feature */}
					<div className="md:col-span-1 md:row-span-2 group relative overflow-hidden rounded-3xl bg-[var(--bg-panel)] dark:bg-background/50 p-8 border border-[var(--border-glass)] dark:border-border transition-colors hover:border-zinc-300 dark:hover:border-border hover:bg-[var(--bg-hover)] dark:hover:bg-background/80 shadow-sm dark:shadow-none">
						<div className="absolute -right-8 -top-8 opacity-[0.02] dark:opacity-5 group-hover:opacity-[0.04] dark:group-hover:opacity-10 transition-opacity">
							<Code2 className="size-64 text-blue-500" />
						</div>
						<div className="relative z-10 flex h-full flex-col">
							<div className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1 text-blue-600 dark:text-blue-500">
								<Database className="size-4" />
								<span className="text-sm font-semibold">Architecture</span>
							</div>
							<h3 className="text-2xl font-bold text-[var(--text-primary)] dark:text-foreground mb-2">
								Multi-Model AI Agent
							</h3>
							<p className="text-[var(--text-muted)] dark:text-muted leading-relaxed mb-8">
								Describe your edits via natural language. Our Python FastAPI
								microservices route tasks across 18 specialized AI providers
								(Google Gemini, Ollama) based on task complexity.
							</p>

							{/* Example prompt */}
							<div className="mt-auto rounded-xl bg-[var(--bg-hover)] dark:bg-background/50 p-4 border border-[var(--border-glass)] dark:border-border font-mono text-xs text-[var(--text-muted)] dark:text-muted shadow-inner overflow-hidden">
								<div className="flex gap-2 mb-2">
									<div className="size-2.5 rounded-full bg-red-400 dark:bg-red-500/50" />
									<div className="size-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500/50" />
									<div className="size-2.5 rounded-full bg-green-400 dark:bg-green-500/50" />
								</div>
								<p>
									<span className="text-pink-600 dark:text-pink-500">
										const
									</span>{" "}
									agent ={" "}
									<span className="text-blue-500 dark:text-blue-400">new</span>{" "}
									TaskRouter();
								</p>
								<p className="mt-1">
									agent.
									<span className="text-green-600 dark:text-green-400">
										execute
									</span>
									(&#123;
								</p>
								<p className="pl-4 mt-1 text-[var(--text-primary)] dark:text-foreground">
									prompt: &quot;Rotoscope the subject&quot;
								</p>
								<p>&#125;);</p>
							</div>
						</div>
					</div>

					{/* Bento Item 3: Small Horizontal */}
					<div className="md:col-span-1 group relative overflow-hidden rounded-3xl bg-[var(--bg-panel)] dark:bg-background/50 p-8 border border-[var(--border-glass)] dark:border-border transition-colors hover:border-zinc-300 dark:hover:border-border hover:bg-[var(--bg-hover)] dark:hover:bg-background/80 shadow-sm dark:shadow-none">
						<div className="relative z-10 flex h-full flex-col justify-end">
							<div className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1 text-indigo-600 dark:text-indigo-500">
								<ShieldCheck className="size-4" />
								<span className="text-sm font-semibold">Privacy</span>
							</div>
							<h3 className="text-xl font-bold text-[var(--text-primary)] dark:text-foreground mb-2">
								Local-First Storage
							</h3>
							<p className="text-sm text-[var(--text-muted)] dark:text-muted">
								IndexedDB & OPFS. Everything lives on your machine until you
								explicitely sync it.
							</p>
						</div>
					</div>

					{/* Bento Item 4: Small Horizontal */}
					<div className="md:col-span-1 group relative overflow-hidden rounded-3xl bg-[var(--bg-panel)] dark:bg-background/50 p-8 border border-[var(--border-glass)] dark:border-border transition-colors hover:border-zinc-300 dark:hover:border-border hover:bg-[var(--bg-hover)] dark:hover:bg-background/80 shadow-sm dark:shadow-none">
						<div className="relative z-10 flex h-full flex-col justify-end">
							<div className="mb-4 inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-emerald-500">
								<Braces className="size-4" />
								<span className="text-sm font-semibold">Extensibility</span>
							</div>
							<h3 className="text-xl font-bold text-[var(--text-primary)] dark:text-foreground mb-2">
								FFMPEG Engine
							</h3>
							<p className="text-sm text-[var(--text-muted)] dark:text-muted">
								Type-safe filter_complex builder wrapped over compiled
								WASM-FFMPEG.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
