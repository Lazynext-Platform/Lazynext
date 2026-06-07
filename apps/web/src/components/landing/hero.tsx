"use client";

import { Button } from "../ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { Handlebars } from "./handlebars";
import Link from "next/link";

export function Hero() {
	return (
		<div className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-between px-4 text-center overflow-hidden bg-zinc-950">
			{/* Stunning Ambient Background Gradients */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-600/30 via-fuchsia-600/10 to-transparent blur-[120px] -z-40 rounded-full animate-pulse duration-10000" />
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-500/20 to-transparent blur-[100px] -z-40 rounded-full" />
			<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-rose-500/20 to-transparent blur-[100px] -z-40 rounded-full" />

			{/* Subtle Noise Texture */}
			<div className="absolute inset-0 z-[-39] bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

			<div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center items-center z-10">
				{/* Premium Glass Badge */}
				<div className="mb-8 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-zinc-200 backdrop-blur-xl shadow-2xl shadow-violet-500/20 transition-transform hover:scale-105 cursor-default animate-in fade-in slide-in-from-bottom-4 duration-700">
					<Sparkles className="mr-2 h-4 w-4 text-violet-400 animate-pulse" />
					<span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
						Now powered by AI Auto-Subtitles
					</span>
				</div>

				<div className="inline-block text-6xl font-extrabold tracking-tighter md:text-[6.5rem] leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 drop-shadow-2xl">
					<h1 className="text-zinc-100">The open source</h1>
					<div className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent py-2">
						<Handlebars>Video editor</Handlebars>
					</div>
				</div>

				<p className="text-zinc-400 mx-auto mt-8 max-w-2xl text-lg font-light tracking-wide sm:text-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 drop-shadow-md">
					A stunningly simple, incredibly powerful video editor that just works. 
					<span className="block mt-2 font-medium text-zinc-300">Run it locally, in the cloud, or straight from your browser.</span>
				</p>

				<div className="mt-14 flex flex-col sm:flex-row justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 w-full sm:w-auto">
					<Link href="/projects" className="w-full sm:w-auto">
						<Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.4)] rounded-2xl group">
							Launch Editor
							<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
						</Button>
					</Link>
					<Link href="https://github.com/lazynext/lazynext" className="w-full sm:w-auto">
						<Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-medium border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md transition-all hover:scale-105 active:scale-95 rounded-2xl">
							View Source
						</Button>
					</Link>
				</div>
			</div>
			
			{/* Bottom fade out to merge with next section */}
			<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-0 pointer-events-none" />
		</div>
	);
}
