"use client";

import { Button } from "../ui/button";
import { ArrowRight, Wand2 } from "lucide-react";
import Image from "next/image";
import { Handlebars } from "./handlebars";
import Link from "next/link";

export function Hero() {
	return (
		<div className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-between px-4 text-center overflow-hidden">
			{/* Dynamic Gradient Backdrop */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-tr from-indigo-500/30 to-fuchsia-500/30 blur-[120px] -z-40 rounded-full animate-in fade-in duration-1000" />
			
			<Image
				className="absolute top-0 left-0 -z-50 size-full object-cover opacity-85 invert dark:invert-0 animate-in fade-in duration-1000"
				src="/landing-page-dark.png"
				height={1903.5}
				width={1269}
				alt="Lazynext video editor landing page background"
			/>
			
			<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center items-center">
				{/* AI Badge */}
				<div className="mb-6 inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/50 px-3 py-1 text-sm text-zinc-300 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
					<Wand2 className="mr-2 h-4 w-4 text-fuchsia-400" />
					Now powered by AI Auto-Subtitles
				</div>

				<div className="inline-block text-5xl font-bold tracking-tighter md:text-[5.5rem] leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
					<h1>The open source</h1>
					<div className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
						<Handlebars>Video editor</Handlebars>
					</div>
				</div>

				<p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-lg font-light tracking-wide sm:text-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
					A stunningly simple, incredibly powerful video editor that just works. Run it locally, in the cloud, or straight from your browser.
				</p>

				<div className="mt-12 flex justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
					<Link href="/projects">
						<Button size="lg" className="h-14 px-8 text-lg font-medium bg-white text-black hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
							Launch Editor
							<ArrowRight className="ml-2 h-5 w-5" />
						</Button>
					</Link>
					<Link href="https://github.com/lazynext/lazynext">
						<Button variant="outline" size="lg" className="h-14 px-8 text-lg font-medium border-zinc-700 hover:bg-zinc-800 transition-all">
							View Source
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
