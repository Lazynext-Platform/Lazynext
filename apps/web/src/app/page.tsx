"use client";

import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import Link from "next/link";
import { Sparkles, Zap, Users, Cpu, ArrowRight, PlayCircle } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Home() {
	const containerRef = useRef(null);
	const { scrollYProgress } = useScroll({
		target: containerRef,
		offset: ["start start", "end start"],
	});
	
	const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
	const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				staggerChildren: 0.15,
				delayChildren: 0.2,
			},
		},
	};

	const itemVariants: any = {
		hidden: { opacity: 0, y: 40 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { type: "spring", stiffness: 400, damping: 30 },
		},
	};

	return (
		<div ref={containerRef} className="min-h-screen bg-[#050505] text-foreground font-sans selection:bg-[#00e5ff]/30 selection:text-[#00e5ff] overflow-x-hidden">
			<MarketingNavbar />

			<main>
				{/* Hero Section */}
				<section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-32 overflow-hidden px-6">
					{/* Deep Abstract Glows (Glassmorphism foundations) */}
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
						<motion.div variants={itemVariants as any} className="inline-flex items-center justify-center mb-8">
							<div className="relative group cursor-pointer">
								<div className="absolute -inset-0.5 bg-gradient-to-r from-[#00e5ff] to-[#0033ff] rounded-full blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
								<div className="relative inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-[#00e5ff] font-medium text-sm">
									<Sparkles className="w-4 h-4 animate-pulse" />
									<span>Introducing Visionary Engine v2.0</span>
								</div>
							</div>
						</motion.div>

						<motion.h1 variants={itemVariants as any} className="text-6xl md:text-8xl lg:text-9xl font-extrabold tracking-tighter mb-8 leading-[1.1]">
							The{" "}
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] via-blue-400 to-[#0033ff]">
								Autonomous
							</span>{" "}
							<br/>Video Editor.
						</motion.h1>

						<motion.p variants={itemVariants as any} className="text-xl md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed">
							Just type or speak in plain language. Lazynext handles the cutting, grading, masking, and motion graphics automatically. 
						</motion.p>

						<motion.div variants={itemVariants as any} className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<Link href="/dashboard" className="w-full sm:w-auto relative group overflow-hidden rounded-full p-[1px]">
								<span className="absolute inset-0 bg-gradient-to-r from-[#00e5ff] to-[#0033ff] opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
								<div className="relative px-8 py-4 bg-black rounded-full flex items-center justify-center gap-2 group-hover:bg-opacity-0 transition duration-300">
									<span className="font-semibold text-white tracking-wide">Enter Studio</span>
									<ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
								</div>
							</Link>
							<button className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 font-semibold transition-all duration-300 backdrop-blur-md flex items-center justify-center gap-2">
								<PlayCircle className="w-5 h-5 text-[#00e5ff]" />
								Watch Demo
							</button>
						</motion.div>
					</motion.div>
				</section>

				{/* Features Grid */}
				<section id="features" className="py-40 px-6 relative z-10 bg-black">
					<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
					
					<motion.div 
						className="max-w-7xl mx-auto"
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={containerVariants}
					>
						<motion.div variants={itemVariants} className="text-center mb-24">
							<h2 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-6">
								Engineered for absolute performance.
							</h2>
							<p className="text-xl text-neutral-400 max-w-2xl mx-auto">
								Built on a blazingly fast WebAssembly core with custom WGSL shaders, delivering native desktop performance directly in your browser.
							</p>
						</motion.div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{/* Feature 1 */}
							<motion.div variants={itemVariants} whileHover={{ y: -10 }} className="relative bg-[#0a0a0c] p-10 border border-white/5 rounded-3xl overflow-hidden group">
								<div className="absolute inset-0 bg-gradient-to-b from-[#00e5ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10">
									<div className="w-16 h-16 bg-[#00e5ff]/10 text-[#00e5ff] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#00e5ff]/20 transition-all duration-500 shadow-[0_0_30px_rgba(0,229,255,0.1)]">
										<Zap className="w-8 h-8" />
									</div>
									<h3 className="text-3xl font-bold mb-4 text-white tracking-tight">
										Text & Voice
									</h3>
									<p className="text-neutral-400 leading-relaxed text-lg">
										Just type or speak. No need to learn complicated manual
										editing tools. Our Agentic engine understands plain language
										and executes complex video edits instantly.
									</p>
								</div>
							</motion.div>

							{/* Feature 2 */}
							<motion.div variants={itemVariants} whileHover={{ y: -10 }} className="relative bg-[#0a0a0c] p-10 border border-white/5 rounded-3xl overflow-hidden group">
								<div className="absolute inset-0 bg-gradient-to-b from-[#0033ff]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10">
									<div className="w-16 h-16 bg-[#0033ff]/20 text-[#00e5ff] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-[#0033ff]/30 transition-all duration-500 shadow-[0_0_30px_rgba(0,51,255,0.1)]">
										<Users className="w-8 h-8" />
									</div>
									<h3 className="text-3xl font-bold mb-4 text-white tracking-tight">
										Multiplayer
									</h3>
									<p className="text-neutral-400 leading-relaxed text-lg">
										Figma for video. Thanks to our custom LWW CRDT networking
										layer, you can edit the exact same timeline simultaneously
										with your colleagues across the globe.
									</p>
								</div>
							</motion.div>

							{/* Feature 3 */}
							<motion.div variants={itemVariants} whileHover={{ y: -10 }} className="relative bg-[#0a0a0c] p-10 border border-white/5 rounded-3xl overflow-hidden group">
								<div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
								<div className="relative z-10">
									<div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
										<Cpu className="w-8 h-8" />
									</div>
									<h3 className="text-3xl font-bold mb-4 text-white tracking-tight">AI Agents</h3>
									<p className="text-neutral-400 leading-relaxed text-lg">
										Stop looking for B-Roll. The Visionary and Chronos AI agents
										analyze your timeline structure and proactively orchestrate
										the Render Farm to generate missing assets.
									</p>
								</div>
							</motion.div>
						</div>
					</motion.div>
				</section>
			</main>

			<MarketingFooter />
		</div>
	);
}
