/**
 * Architecture section — displays the multi-platform architecture
 * diagram with project cards on the landing page.
 *
 * @module components/landing/ArchitectureSection
 */

import { Cpu, Combine, Blocks } from "lucide-react";

const PROJECTS = [
	"Auto-Editor",
	"Clip-Anything",
	"LazynextClip",
	"Open-Sora",
	"FFMPEG",
	"Whisper",
	"VALL-E X",
	"Stable Diffusion",
	"ControlNet",
	"SadTalker",
	"Thin-Plate Spline",
	"Wav2Lip",
	"EB-Synth",
	"Rembg",
	"SAM",
	"NeRF",
	"GPUI",
];

/** React component rendering ArchitectureSection. */
export function ArchitectureSection() {
	return (
		<section className="relative overflow-hidden bg-background px-4 py-24 border-y border-border transition-colors duration-300">
			<div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] dark:opacity-[0.04] mix-blend-overlay pointer-events-none" />

			<div className="mx-auto max-w-6xl">
				<div className="grid lg:grid-cols-2 gap-16 items-center">
					{/* Left Text */}
					<div>
						<div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-indigo-500/10 px-3 py-1 text-indigo-600 dark:text-indigo-400">
							<Combine className="size-4" />
							<span className="text-sm font-semibold">The Monorepo</span>
						</div>
						<h2 className="text-3xl font-extrabold text-foreground md:text-4xl mb-6 leading-tight">
							17 Enterprise Microservices.
							<br />
							One Unified Timeline.
						</h2>
						<p className="mt-4 text-muted text-lg leading-relaxed max-w-2xl mx-auto">
							We didn&apos;t just build an editor. We built an Lazynext AI Agent that edits
							footage for you based on text prompts. Lazynext acts as the
							central nervous system bridging Python ML servers, Rust core
							binaries, and WebAssembly to execute your natural language
							commands.
						</p>

						<ul className="space-y-4">
							<li className="flex items-start gap-3">
								<div className="mt-1 rounded-full bg-[var(--accent-primary)]/20 p-1.5">
									<Cpu className="size-4 text-[var(--accent-primary)] dark:text-[var(--accent-primary)]" />
								</div>
								<div>
									<h4 className="font-semibold text-foreground">
										GPU-Accelerated Inference
									</h4>
									<p className="text-sm text-muted">
										Seamlessly runs tensor operations via PyTorch and ONNX,
										directly managed by our FastAPI orchestration layer.
									</p>
								</div>
							</li>
							<li className="flex items-start gap-3">
								<div className="mt-1 rounded-full bg-emerald-500/20 p-1.5">
									<Blocks className="size-4 text-emerald-600 dark:text-emerald-400" />
								</div>
								<div>
									<h4 className="font-semibold text-foreground">
										Modular Architecture
									</h4>
									<p className="text-sm text-muted">
										Easily swap out any model. Upgrade Whisper to Deepgram, or
										swap SDXL for Midjourney without breaking the timeline
										structure.
									</p>
								</div>
							</li>
						</ul>
					</div>

					{/* Right Visual Ticker */}
					<div className="relative h-[400px] rounded-3xl border border-border bg-panel/50 p-8 overflow-hidden flex flex-col justify-center">
						<div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-main)] dark:from-[var(--bg-main)] via-transparent to-[var(--bg-main)] dark:to-[var(--bg-main)] z-10 pointer-events-none" />

						<div className="flex flex-col gap-6 transform rotate-[-2deg] scale-110">
							{/* Row 1 */}
							<div className="flex gap-4 animate-[scroll_40s_linear_infinite]">
								{[...PROJECTS, ...PROJECTS].slice(0, 10).map((p, i) => (
									<div
										key={`r1-${i}`}
										className="whitespace-nowrap rounded-xl border border-border bg-panel px-6 py-3 font-mono text-sm text-secondary backdrop-blur-md shadow-sm dark:shadow-none"
									>
										{p}
									</div>
								))}
							</div>

							{/* Row 2 */}
							<div className="flex gap-4 animate-[scroll_50s_linear_infinite_reverse]">
								{[...PROJECTS, ...PROJECTS].slice(5, 15).map((p, i) => (
									<div
										key={`r2-${i}`}
										className="whitespace-nowrap rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 px-6 py-3 font-mono text-sm text-indigo-700 dark:text-indigo-300 backdrop-blur-md shadow-sm dark:shadow-none"
									>
										{p}
									</div>
								))}
							</div>

							{/* Row 3 */}
							<div className="flex gap-4 animate-[scroll_35s_linear_infinite]">
								{[...PROJECTS, ...PROJECTS].slice(10, 20).map((p, i) => (
									<div
										key={`r3-${i}`}
										className="whitespace-nowrap rounded-xl border border-border bg-panel px-6 py-3 font-mono text-sm text-secondary backdrop-blur-md shadow-sm dark:shadow-none"
									>
										{p}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
