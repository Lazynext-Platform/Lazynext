/**
 * Landing page — hero with video demo, tagline, competitor feature
 * comparison grid, how-it-works section, CTA, and social proof.
 *
 * @page /
 */

"use client";

import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import Link from "next/link";
import {
	Sparkles,
	ArrowRight,
	PlayCircle,
	Type,
	Mic,
	Edit3,
	Video,
	Palette,
	Zap,
	CheckCircle2,
	Command,
	Star,
	Users,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/** Animation variants */
const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.12, delayChildren: 0.2 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 40 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { type: "spring" as const, stiffness: 400, damping: 30 },
	},
};

const competitorFeatures = [
	{
		competitor: "Premiere Pro",
		gradient: "from-purple-500 to-violet-600",
		icon: Video,
		features: [
			"Multi-track timeline editing",
			"Keyframe animation system",
			"Advanced color grading (Lumetri)",
			"Audio mixing & effects rack",
			"Motion graphics templates",
			"Proxy workflow support",
		],
	},
	{
		competitor: "DaVinci Resolve",
		gradient: "from-orange-500 to-red-500",
		icon: Palette,
		features: [
			"Professional color correction",
			"Fusion VFX compositing",
			"Fairlight audio post-production",
			"Node-based grading workflow",
			"HDR grading & Dolby Vision",
			"Collaborative multi-user mode",
		],
	},
	{
		competitor: "CapCut",
		gradient: "from-cyan-400 to-blue-500",
		icon: Zap,
		features: [
			"One-click AI effects",
			"Auto-captions & text-to-speech",
			"Viral-ready templates",
			"Background removal",
			"Speed curve ramping",
			"Social media aspect ratios",
		],
	},
	{
		competitor: "Descript",
		gradient: "from-emerald-400 to-teal-500",
		icon: Edit3,
		features: [
			"Transcript-based editing",
			"Filler word removal",
			"AI voice cloning (Overdub)",
			"Screen recording & editing",
			"Multi-track audio editing",
			"Publish to podcast platforms",
		],
	},
];

/** Home landing page with animated hero and all sections. */
export default function Home() {
	const containerRef = useRef(null);
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end start"],
	});

	const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
	const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

	return (
		<div
			ref={containerRef}
			className="min-h-screen bg-[#050505] text-foreground font-sans selection:bg-[#00e5ff]/30 selection:text-[#00e5ff] overflow-x-hidden"
		>
			<MarketingNavbar />

			<main>
				{/* ──────────────── Hero Section ──────────────── */}
				<section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-32 overflow-hidden px-6">
					{/* Deep Abstract Glows */}
					<motion.div
						style={{ y, opacity }}
						className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] pointer-events-none mix-blend-screen opacity-60"
					>
						<div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-purple-600/20 rounded-full blur-[140px] animate-pulse-slow" />
						<div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-400/10 rounded-full blur-[100px]" />
					</motion.div>

					<div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

					<motion.div
						className="max-w-6xl mx-auto text-center relative z-10"
						variants={containerVariants}
						initial="hidden"
						animate="visible"
					>
						{/* Status Pill */}
						<motion.div
							variants={itemVariants}
							className="inline-flex items-center justify-center mb-8"
						>
							<div className="relative group cursor-pointer">
								<div className="absolute -inset-0.5 bg-gradient-to-r from-[#00e5ff] to-[#0033ff] rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-tilt" />
								<div className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-[#00e5ff] font-medium text-sm">
									<Sparkles className="w-4 h-4 animate-pulse" />
									<span>Visionary Engine v2.0 — Now Live</span>
								</div>
							</div>
						</motion.div>

						{/* Main Headline */}
						<motion.h1
							variants={itemVariants}
							className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 leading-[1.05]"
						>
							The{" "}
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] via-blue-400 to-[#0033ff]">
								Autonomous
							</span>
							<br />
							Video Editor.
						</motion.h1>

						{/* Tagline */}
						<motion.div
							variants={itemVariants}
							className="flex items-center justify-center gap-3 mb-8"
						>
							<span className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-white/80">
								Type. Speak. Edit.
							</span>
						</motion.div>

						{/* Subheadline */}
						<motion.p
							variants={itemVariants}
							className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed"
						>
							Just describe your edit in plain language. Lazynext
							handles cutting, grading, masking, and motion
							graphics automatically.
						</motion.p>

						{/* CTA Buttons */}
						<motion.div
							variants={itemVariants}
							className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
						>
							<Link
								href="/dashboard"
								className="w-full sm:w-auto relative group overflow-hidden rounded-full p-[1px]"
							>
								<span className="absolute inset-0 bg-gradient-to-r from-[#00e5ff] to-[#0033ff] opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
								<div className="relative px-8 py-4 bg-black rounded-full flex items-center justify-center gap-2 group-hover:bg-opacity-0 transition duration-300">
									<span className="font-semibold text-white tracking-wide">
										Start Editing Free
									</span>
									<ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
								</div>
							</Link>
							<button
								type="button"
								className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 font-semibold transition-all duration-300 backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer"
							>
								<PlayCircle className="w-5 h-5 text-[#00e5ff]" />
								Watch Demo
							</button>
						</motion.div>

						{/* Video Demo Placeholder */}
						<motion.div
							variants={itemVariants}
							className="relative max-w-4xl mx-auto"
						>
							<div className="absolute -inset-1 bg-gradient-to-r from-[#00e5ff]/30 via-blue-500/30 to-[#0033ff]/30 rounded-2xl blur-xl" />
							<div className="relative aspect-video bg-black/80 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center">
								<div className="flex flex-col items-center gap-4">
									<div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_40px_rgba(0,229,255,0.3)] animate-pulse">
										<PlayCircle className="w-10 h-10 text-black" />
									</div>
									<span className="text-white/30 text-sm font-medium">
										Lazynext Logo Animation
									</span>
								</div>
								{/* Corner tag */}
								<div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/50 flex items-center gap-1.5">
									<div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
									4K Demo
								</div>
							</div>
						</motion.div>
					</motion.div>
				</section>

				{/* ──────────────── Competitor Feature Comparison ──────────────── */}
				<section className="py-32 px-6 relative z-10 bg-black">
					<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

					<motion.div
						className="max-w-7xl mx-auto"
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={containerVariants}
					>
						<motion.div
							variants={itemVariants}
							className="text-center mb-20"
						>
							<h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
								Everything your tools do.
								<br />
								<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-[#0033ff]">
									All in one place.
								</span>
							</h2>
							<p className="text-lg text-white/40 max-w-2xl mx-auto">
								We didn&apos;t just build another editor. We combined
								the best of every major NLE into a single
								AI-native platform.
							</p>
						</motion.div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
							{competitorFeatures.map((comp) => {
								const CompIcon = comp.icon;
								return (
									<motion.div
										key={comp.competitor}
										variants={itemVariants}
										whileHover={{ y: -6 }}
										className="relative bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 overflow-hidden group"
									>
										<div
											className={`absolute inset-0 bg-gradient-to-b ${comp.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
										/>
										<div className="relative z-10">
											<div className="flex items-center gap-3 mb-5">
												<div
													className={`w-10 h-10 rounded-xl bg-gradient-to-br ${comp.gradient} flex items-center justify-center shadow-lg`}
												>
													<CompIcon className="w-5 h-5 text-white" />
												</div>
												<div>
													<span className="text-xs text-white/30 uppercase tracking-wider font-bold">
														Everything
													</span>
													<h3 className="text-lg font-bold text-white leading-tight">
														{comp.competitor} does
													</h3>
												</div>
											</div>
											<ul className="space-y-2.5">
												{comp.features.map((feat) => (
													<li
														key={feat}
														className="flex items-start gap-2"
													>
														<CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
														<span className="text-sm text-white/60 leading-snug">
															{feat}
														</span>
													</li>
												))}
											</ul>
										</div>
									</motion.div>
								);
							})}
						</div>
					</motion.div>
				</section>

				{/* ──────────────── How It Works ──────────────── */}
				<section className="py-32 px-6 relative z-10 bg-black">
					<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

					<motion.div
						className="max-w-5xl mx-auto"
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={containerVariants}
					>
						<motion.div
							variants={itemVariants}
							className="text-center mb-20"
						>
							<h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
								How It Works
							</h2>
							<p className="text-lg text-white/40">
								Three steps from idea to finished video.
							</p>
						</motion.div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{[
								{
									step: "01",
									title: "Type your edit",
									description:
										"Describe what you want in plain English. 'Remove all silences', 'Add cinematic color grade', 'Generate captions'. No manual timeline dragging.",
									icon: Type,
									gradient: "from-cyan-400 to-blue-500",
								},
								{
									step: "02",
									title: "AI understands",
									description:
										"Lazynext AI Agent, our AI copilot, analyzes your timeline, plans the edits, and shows you exactly what will change before executing anything.",
									icon: Command,
									gradient: "from-blue-500 to-purple-500",
								},
								{
									step: "03",
									title: "Done.",
									description:
										"Your edit is applied instantly. Export in any format, any resolution, any platform. Or keep refining with more natural language commands.",
									icon: CheckCircle2,
									gradient: "from-purple-500 to-[#00e5ff]",
								},
							].map((step) => (
								<motion.div
									key={step.step}
									variants={itemVariants}
									whileHover={{ y: -6 }}
									className="relative bg-[#0a0a0c] border border-white/5 rounded-2xl p-8 overflow-hidden group text-center"
								>
									<div className="relative z-10">
										<div
											className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}
										>
											<step.icon className="w-7 h-7 text-white" />
										</div>
										<span className="text-xs font-bold text-[#00e5ff] uppercase tracking-widest mb-3 block">
											Step {step.step}
										</span>
										<h3 className="text-xl font-bold text-white mb-3">
											{step.title}
										</h3>
										<p className="text-sm text-white/50 leading-relaxed">
											{step.description}
										</p>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>
				</section>

				{/* ──────────────── Features Grid ──────────────── */}
				<section
					id="features"
					className="py-32 px-6 relative z-10 bg-black"
				>
					<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

					<motion.div
						className="max-w-7xl mx-auto"
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={containerVariants}
					>
						<motion.div
							variants={itemVariants}
							className="text-center mb-24"
						>
							<h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
								Engineered for absolute performance.
							</h2>
							<p className="text-lg text-white/40 max-w-2xl mx-auto">
								Built on a blazingly fast WebAssembly core with
								custom WGSL shaders, delivering native desktop
								performance directly in your browser.
							</p>
						</motion.div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							<motion.div
								variants={itemVariants}
								whileHover={{ y: -10 }}
								className="relative bg-[#0a0a0c] p-10 border border-white/5 rounded-3xl overflow-hidden group"
							>
								<div className="absolute inset-0 bg-gradient-to-b from-[#00e5ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10">
									<div className="w-16 h-16 bg-[#00e5ff]/10 text-[#00e5ff] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#00e5ff]/20 transition-all duration-500 shadow-[0_0_30px_rgba(0,229,255,0.1)]">
										<Type className="w-8 h-8" />
										<Mic className="w-5 h-5 -ml-1" />
									</div>
									<h3 className="text-3xl font-bold mb-4 text-white tracking-tight">
										Text & Voice
									</h3>
									<p className="text-white/40 leading-relaxed text-lg">
										Just type or speak. No need to learn
										complicated manual editing tools. Our
										Agentic engine understands plain
										language and executes complex video
										edits instantly.
									</p>
								</div>
							</motion.div>

							<motion.div
								variants={itemVariants}
								whileHover={{ y: -10 }}
								className="relative bg-[#0a0a0c] p-10 border border-white/5 rounded-3xl overflow-hidden group"
							>
								<div className="absolute inset-0 bg-gradient-to-b from-[#0033ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10">
									<div className="w-16 h-16 bg-[#0033ff]/20 text-[#00e5ff] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#0033ff]/30 transition-all duration-500 shadow-[0_0_30px_rgba(0,51,255,0.1)]">
										<Users className="w-8 h-8" />
									</div>
									<h3 className="text-3xl font-bold mb-4 text-white tracking-tight">
										Multiplayer
									</h3>
									<p className="text-white/40 leading-relaxed text-lg">
										Figma for video. Thanks to our custom
										LWW CRDT networking layer, you can edit
										the exact same timeline simultaneously
										with your colleagues across the globe.
									</p>
								</div>
							</motion.div>

							<motion.div
								variants={itemVariants}
								whileHover={{ y: -10 }}
								className="relative bg-[#0a0a0c] p-10 border border-white/5 rounded-3xl overflow-hidden group"
							>
								<div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10">
									<div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
										<Sparkles className="w-8 h-8" />
									</div>
									<h3 className="text-3xl font-bold mb-4 text-white tracking-tight">
										AI Agents
									</h3>
									<p className="text-white/40 leading-relaxed text-lg">
										Stop looking for B-Roll. The Visionary
										and Lazynext AI Agent agents analyze your
										timeline structure and proactively
										orchestrate the Render Farm to
										generate missing assets.
									</p>
								</div>
							</motion.div>
						</div>
					</motion.div>
				</section>

				{/* ──────────────── Social Proof ──────────────── */}
				<section className="py-24 px-6 relative z-10 bg-black">
					<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

					<motion.div
						className="max-w-5xl mx-auto"
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={containerVariants}
					>
						<motion.div
							variants={itemVariants}
							className="text-center mb-16"
						>
							<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
								Trusted by creators worldwide
							</h2>
							<p className="text-white/40">
								Join thousands of editors who switched to
								AI-native editing.
							</p>
						</motion.div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
							{[
								{
									quote: "Lazynext cut my editing time by 70%. I just describe what I want and it happens.",
									name: "Alex Chen",
									role: "YouTube Creator, 2M+ subs",
								},
								{
									quote: "The multiplayer is a game-changer. Our team of 5 edits the same project simultaneously without conflicts.",
									name: "Sarah Kim",
									role: "Video Production Lead",
								},
								{
									quote: "Finally an editor that understands creators. The AI suggestions are genuinely useful, not gimmicky.",
									name: "Marcus Rivera",
									role: "Freelance Filmmaker",
								},
							].map((t) => (
								<motion.div
									key={t.name}
									variants={itemVariants}
									className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6"
								>
									<div className="flex gap-1 mb-4">
										{[...Array(5)].map((_, s) => (
											<Star
												key={s}
												className="w-4 h-4 text-amber-400 fill-current"
											/>
										))}
									</div>
									<p className="text-sm text-white/60 leading-relaxed mb-4 italic">
										&quot;{t.quote}&quot;
									</p>
									<div>
										<p className="text-sm font-semibold text-white">
											{t.name}
										</p>
										<p className="text-xs text-white/30">
											{t.role}
										</p>
									</div>
								</motion.div>
							))}
						</div>

						{/* Social proof stats */}
						<motion.div
							variants={itemVariants}
							className="grid grid-cols-2 md:grid-cols-4 gap-6"
						>
							{[
								{ value: "10K+", label: "Active Editors" },
								{
									value: "500K+",
									label: "Videos Created",
								},
								{ value: "99.9%", label: "Uptime SLA" },
								{
									value: "4.9/5",
									label: "Average Rating",
								},
							].map((stat) => (
								<div
									key={stat.label}
									className="text-center"
								>
									<div className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-blue-400 mb-1">
										{stat.value}
									</div>
									<div className="text-xs text-white/30 uppercase tracking-wider">
										{stat.label}
									</div>
								</div>
							))}
						</motion.div>
					</motion.div>
				</section>

				{/* ──────────────── CTA ──────────────── */}
				<section className="py-32 px-6 relative z-10 bg-black overflow-hidden">
					<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

					{/* Dramatic Center Gradient Burst */}
					<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400/20 via-indigo-400/10 to-transparent blur-[80px] pointer-events-none" />

					<motion.div
						className="relative z-10 mx-auto max-w-3xl text-center"
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={containerVariants}
					>
						<motion.h2
							variants={itemVariants}
							className="text-4xl font-extrabold text-white md:text-6xl tracking-tight leading-[1.1] mb-6"
						>
							Start Editing Free
							<br />
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-[#0033ff]">
								No Manual Work Required.
							</span>
						</motion.h2>
						<motion.p
							variants={itemVariants}
							className="mx-auto mt-6 max-w-xl text-lg text-white/40"
						>
							Edit at the speed of thought. Type what you want,
							and let AI handle the timeline. Free tier
							includes unlimited local rendering and 5 AI
							credits.
						</motion.p>

						<motion.div
							variants={itemVariants}
							className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
						>
							<Link
								href="/sign-up"
								className="group relative overflow-hidden rounded-full p-[1px]"
							>
								<span className="absolute inset-0 bg-gradient-to-r from-[#00e5ff] to-[#0033ff] opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
								<div className="relative px-10 py-4 bg-black rounded-full flex items-center justify-center gap-2">
									<Sparkles className="w-5 h-5 text-[#00e5ff]" />
									<span className="font-bold text-white">
										Start Editing Free
									</span>
									<ArrowRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
								</div>
							</Link>
						</motion.div>

						<motion.div
							variants={itemVariants}
							className="mt-8 flex items-center justify-center gap-2 text-sm text-white/30"
						>
							<div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
							<span>
								Free tier includes unlimited local rendering
								and 5 AI credits.
							</span>
						</motion.div>
					</motion.div>
				</section>
			</main>

			<MarketingFooter />
		</div>
	);
}
