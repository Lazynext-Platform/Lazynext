"use client";

import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import Link from "next/link";
import { Sparkles, Zap, Users, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.2,
			},
		},
	};

	const itemVariants = {
		hidden: { opacity: 0, y: 30 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { type: "spring", stiffness: 300, damping: 24 },
		},
	};

	return (
		<div className="min-h-screen bg-[#09090b] text-foreground font-sans selection:bg-[#00e5ff]/30 selection:text-[#00e5ff] overflow-x-hidden">
			<MarketingNavbar />

			<main>
				{/* Hero Section */}
				<section className="relative pt-48 pb-32 overflow-hidden px-6">
					{/* Deep Abstract Glows (Glassmorphism foundations) */}
					<div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[800px] bg-cyan-600/10 rounded-[100%] blur-[120px] pointer-events-none mix-blend-screen" />
					<div className="absolute top-1/2 left-1/2 -translate-x-1/4 w-[800px] h-[600px] bg-blue-700/10 rounded-[100%] blur-[100px] pointer-events-none mix-blend-screen" />

					<motion.div 
						className="max-w-5xl mx-auto text-center relative z-10"
						variants={containerVariants}
						initial="hidden"
						animate="visible"
					>
						<motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/5 shadow-[0_0_20px_rgba(0,229,255,0.1)] text-[#00e5ff] font-medium text-sm mb-8">
							<Sparkles className="w-4 h-4" />
							<span>Introducing the Visionary Engine v2.0</span>
						</motion.div>

						<motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8 leading-tight">
							The{" "}
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-[#0033ff]">
								Autonomous
							</span>{" "}
							<br/>Video Editor.
						</motion.h1>

						<motion.p variants={itemVariants} className="text-xl md:text-2xl text-neutral-400 max-w-3xl mx-auto mb-12 font-light">
							Say goodbye to Premiere, DaVinci, CapCut, and Descript. No more
							manual timelines or keyframes. Just type or speak in simple
							language, and our Agentic AI will completely edit the video for
							you.
						</motion.p>

						<motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<Link
								href="/editor"
								className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(0,229,255,0.4)]"
							>
								Start Editing with AI
							</Link>
							<Link
								href="/billing"
								className="w-full sm:w-auto px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 text-white font-semibold rounded-2xl hover:bg-white/10 transition-colors duration-300"
							>
								View Pro Plans
							</Link>
						</motion.div>
					</motion.div>
				</section>

				{/* Features Grid */}
				<section id="features" className="py-32 px-6 relative z-10">
					<motion.div 
						className="max-w-7xl mx-auto"
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={containerVariants}
					>
						<motion.h2 variants={itemVariants} className="text-4xl md:text-5xl font-bold text-center mb-20">
							Engineered for absolute performance.
						</motion.h2>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{/* Feature 1 */}
							<motion.div variants={itemVariants} whileHover={{ y: -10 }} className="bg-black/40 backdrop-blur-xl p-8 border border-white/5 rounded-3xl hover:border-[#00e5ff]/40 transition-all duration-500 group shadow-lg hover:shadow-[0_10px_40px_rgba(0,229,255,0.1)]">
								<div className="w-14 h-14 bg-[#00e5ff]/10 text-[#00e5ff] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#00e5ff]/20 transition-all duration-300">
									<Zap className="w-7 h-7" />
								</div>
								<h3 className="text-2xl font-bold mb-4 text-white">
									Text & Voice Commands
								</h3>
								<p className="text-neutral-400 leading-relaxed">
									Just type or speak. No need to learn complicated manual
									editing tools. Our Agentic engine understands plain language
									and executes complex video edits instantly.
								</p>
							</motion.div>

							{/* Feature 2 */}
							<motion.div variants={itemVariants} whileHover={{ y: -10 }} className="bg-black/40 backdrop-blur-xl p-8 border border-white/5 rounded-3xl hover:border-[#0033ff]/40 transition-all duration-500 group shadow-lg hover:shadow-[0_10px_40px_rgba(0,51,255,0.1)]">
								<div className="w-14 h-14 bg-[#0033ff]/20 text-[#00e5ff] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#0033ff]/30 transition-all duration-300">
									<Users className="w-7 h-7" />
								</div>
								<h3 className="text-2xl font-bold mb-4 text-white">
									Real-Time Multiplayer
								</h3>
								<p className="text-neutral-400 leading-relaxed">
									Figma for video. Thanks to our custom LWW CRDT networking
									layer, you can edit the exact same timeline simultaneously
									with your colleagues across the globe.
								</p>
							</motion.div>

							{/* Feature 3 */}
							<motion.div variants={itemVariants} whileHover={{ y: -10 }} className="bg-black/40 backdrop-blur-xl p-8 border border-white/5 rounded-3xl hover:border-[#00e5ff]/40 transition-all duration-500 group shadow-lg hover:shadow-[0_10px_40px_rgba(0,229,255,0.1)]">
								<div className="w-14 h-14 bg-[#00e5ff]/10 text-[#00e5ff] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#00e5ff]/20 transition-all duration-300">
									<Cpu className="w-7 h-7" />
								</div>
								<h3 className="text-2xl font-bold mb-4 text-white">Autonomous AI Agents</h3>
								<p className="text-neutral-400 leading-relaxed">
									Stop looking for B-Roll. The Visionary and Chronos AI agents
									analyze your timeline structure and proactively orchestrate
									the Render Farm to generate missing assets.
								</p>
							</motion.div>
						</div>
					</motion.div>
				</section>
			</main>

			<MarketingFooter />
		</div>
	);
}
