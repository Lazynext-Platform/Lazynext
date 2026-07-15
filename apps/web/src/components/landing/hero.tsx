/**
 * Hero component — animated hero section with gradient background,
 * CTA buttons, and screenshot preview for the landing page.
 *
 * @module components/landing/hero
 */

"use client";

import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { Handlebars } from "./handlebars";
import Link from "next/link";

export function Hero() {
	return (
		<div className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-between px-4 text-center overflow-hidden bg-background">
			{/* Stunning Ambient Background Gradients */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/30 via-fuchsia-600/10 to-transparent blur-[120px] -z-40 rounded-full animate-pulse duration-10000" />
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-500/20 to-transparent blur-[100px] -z-40 rounded-full" />
			<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-rose-500/20 to-transparent blur-[100px] -z-40 rounded-full" />

			{/* Subtle Noise Texture */}
			<div className="absolute inset-0 z-[-39] bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

			<div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center items-center z-10">
				<div className="inline-block text-6xl font-extrabold tracking-tighter md:text-[6.5rem] leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 drop-shadow-2xl">
					<h1 className="text-foreground">The open source</h1>
					<div className="bg-gradient-to-r from-[var(--text-primary)] via-[var(--text-secondary)] to-[var(--text-muted)] bg-clip-text text-transparent py-2">
						<Handlebars>Video editor</Handlebars>
					</div>
				</div>

				<p className="text-muted mx-auto mt-8 max-w-2xl text-lg font-light tracking-wide sm:text-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 drop-shadow-md">
					A stunningly simple, incredibly powerful video editor that just works.
					<span className="block mt-2 font-medium text-foreground">
						Run it locally, in the cloud, or straight from your browser.
					</span>
				</p>

				<div className="mt-14 flex flex-col sm:flex-row justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 w-full sm:w-auto">
					<Link href="/projects" className="w-full sm:w-auto">
						<Button
							size="lg"
							className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:bg-[var(--accent-primary)]/80 transition-all hover:scale-105 active:scale-95 shadow-[var(--accent-glow)] rounded-2xl group"
						>
							Launch Editor
							<ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
						</Button>
					</Link>
					<Link
						href="https://github.com/Lazynext-Corporation/lazynext"
						className="w-full sm:w-auto"
					>
						<Button
							variant="outline"
							size="lg"
							className="w-full sm:w-auto h-14 px-8 text-lg font-medium border-border bg-hover hover:bg-glass text-foreground backdrop-blur-md transition-all hover:scale-105 active:scale-95 rounded-2xl"
						>
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
