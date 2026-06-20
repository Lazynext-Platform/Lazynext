import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import Link from "next/link";
import { Sparkles, Zap, Users, Cpu } from "lucide-react";

export default function Home() {
	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#00e5ff]/30 selection:text-[#00e5ff]">
			<MarketingNavbar />

			<main>
				{/* Hero Section */}
				<section className="relative pt-48 pb-32 overflow-hidden px-6">
					{/* Abstract Glows */}
					<div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#00e5ff]/20 rounded-[100%] blur-[120px] pointer-events-none" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/4 w-[600px] h-[400px] bg-[#0033ff]/20 rounded-[100%] blur-[100px] pointer-events-none" />

					<div className="max-w-5xl mx-auto text-center relative z-10">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-600/10 dark:bg-[#00e5ff]/10 border border-cyan-600/30 dark:border-[#00e5ff]/20 text-cyan-600 dark:text-[#00e5ff] font-medium text-sm mb-8">
							<Sparkles className="w-4 h-4" />
							<span>Introducing the Visionary Engine v2.0</span>
						</div>

						<h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8">
							The{" "}
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700 dark:from-[#00e5ff] dark:to-[#0033ff]">
								Autonomous
							</span>{" "}
							Video Editor.
						</h1>

						<p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto mb-12">
							Say goodbye to Premiere, DaVinci, CapCut, and Descript. No more
							manual timelines or keyframes. Just type or speak in simple
							language, and our Agentic AI will completely edit the video for
							you.
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<Link
								href="/editor"
								className="w-full sm:w-auto px-8 py-4 bg-foreground text-background font-semibold rounded-2xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
							>
								Start Editing with AI
							</Link>
							<Link
								href="/billing"
								className="w-full sm:w-auto px-8 py-4 bg-panel border border-border text-foreground font-semibold rounded-2xl hover:bg-hover transition-colors"
							>
								View Pro Plans
							</Link>
						</div>
					</div>
				</section>

				{/* Features Grid */}
				<section id="features" className="py-32 px-6">
					<div className="max-w-7xl mx-auto">
						<h2 className="text-4xl font-bold text-center mb-16">
							Engineered for absolute performance.
						</h2>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{/* Feature 1 */}
							<div className="glass-panel p-8 border border-neutral-200 dark:border-white/10 hover:border-cyan-600/40 dark:hover:border-[#00e5ff]/40 transition-colors group">
								<div className="w-12 h-12 bg-cyan-600/10 dark:bg-[#00e5ff]/10 text-cyan-600 dark:text-[#00e5ff] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
									<Zap className="w-6 h-6" />
								</div>
								<h3 className="text-xl font-bold mb-3">
									Text & Voice Commands
								</h3>
								<p className="text-neutral-600 dark:text-neutral-400">
									Just type or speak. No need to learn complicated manual
									editing tools. Our Agentic engine understands plain language
									and executes complex video edits instantly.
								</p>
							</div>

							{/* Feature 2 */}
							<div className="glass-panel p-8 border border-neutral-200 dark:border-white/10 hover:border-blue-600/40 dark:hover:border-[#0033ff]/40 transition-colors group">
								<div className="w-12 h-12 bg-blue-600/10 dark:bg-[#0033ff]/20 text-cyan-600 dark:text-[#00e5ff] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
									<Users className="w-6 h-6" />
								</div>
								<h3 className="text-xl font-bold mb-3">
									Real-Time Multiplayer
								</h3>
								<p className="text-neutral-600 dark:text-neutral-400">
									Figma for video. Thanks to our custom LWW CRDT networking
									layer, you can edit the exact same timeline simultaneously
									with your colleagues across the globe.
								</p>
							</div>

							{/* Feature 3 */}
							<div className="glass-panel p-8 border border-neutral-200 dark:border-white/10 hover:border-cyan-600/40 dark:hover:border-[#00e5ff]/40 transition-colors group">
								<div className="w-12 h-12 bg-cyan-600/10 dark:bg-[#00e5ff]/10 text-cyan-600 dark:text-[#00e5ff] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
									<Cpu className="w-6 h-6" />
								</div>
								<h3 className="text-xl font-bold mb-3">Autonomous AI Agents</h3>
								<p className="text-neutral-600 dark:text-neutral-400">
									Stop looking for B-Roll. The Visionary and Chronos AI agents
									analyze your timeline structure and proactively orchestrate
									the Render Farm to generate missing assets.
								</p>
							</div>
						</div>
					</div>
				</section>
			</main>

			<MarketingFooter />
		</div>
	);
}
