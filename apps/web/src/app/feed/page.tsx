/**
 * Video feed page — scrollable feed of community videos with playback.
 *
 * @page /feed
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { VideoPlayer } from "@/components/feed/VideoPlayer";
import Link from "next/link";
import { ArrowLeft, Compass, Video as VideoIcon, Sparkles } from "lucide-react";

// Sample published videos for the community feed
const FEED_DATA = [
	{
		id: "vid_1",
		url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
		author: "neon_director",
		description:
			"Cyberpunk short film edited entirely in Lazynext. The AI rotoscoping is insane! 🤯",
		songName: "Synthwave Vibes - Lazynext Original",
		likes: 12400,
		comments: 342,
	},
	{
		id: "vid_2",
		url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
		author: "vfx_master",
		description:
			"Just testing the new 3D Fusion Node Graph. Rendered on the cloud farm in 12s.",
		songName: "Original Audio - vfx_master",
		likes: 8900,
		comments: 120,
	},
	{
		id: "vid_3",
		url: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
		author: "sci_fi_geek",
		description:
			"Color graded using the new Sentient Color Engine. Match matched to Matrix.",
		songName: "Epic Cinematic Score - royalty free",
		likes: 45000,
		comments: 890,
	},
];

export default function FeedPage() {
	const [activeIndex, setActiveIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => {
			if (!containerRef.current) return;

			const scrollPosition = containerRef.current.scrollTop;
			const windowHeight = containerRef.current.clientHeight;

			const newActiveIndex = Math.round(scrollPosition / windowHeight);

			if (
				newActiveIndex !== activeIndex &&
				newActiveIndex >= 0 &&
				newActiveIndex < FEED_DATA.length
			) {
				setActiveIndex(newActiveIndex);
			}
		};

		const container = containerRef.current;
		if (container) {
			container.addEventListener("scroll", handleScroll, { passive: true });
		}

		return () => {
			if (container) {
				container.removeEventListener("scroll", handleScroll);
			}
		};
	}, [activeIndex]);

	return (
		<div className="w-full h-[calc(100vh-73px)] flex overflow-hidden bg-transparent pt-10">
			{/* Desktop Sidebar Navigation */}
			<div className="hidden lg:flex flex-col gap-8 w-[250px] ml-6 h-[calc(100%-40px)] glass-panel p-6 shadow-2xl relative z-10">
				<h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-primary)]/70">
					LAZYNEXT<span className="text-[var(--accent-primary)]">.</span>
				</h1>

				<nav className="flex flex-col gap-4">
					<Link
						href="/feed"
						className="flex items-center gap-4 text-[var(--accent-primary)] font-bold text-lg p-3 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 shadow-[var(--accent-glow)]"
					>
						<Compass className="w-6 h-6" /> Explore
					</Link>
					<Link
						href="/editor"
						className="flex items-center gap-4 text-foreground/50 hover:text-foreground font-bold text-lg p-3 rounded-xl hover:bg-hover transition-colors"
					>
						<VideoIcon className="w-6 h-6" /> Create
					</Link>
					<Link
						href="/dashboard"
						className="flex items-center gap-4 text-foreground/50 hover:text-foreground font-bold text-lg p-3 rounded-xl hover:bg-hover transition-colors"
					>
						<Sparkles className="w-6 h-6" /> Dashboard
					</Link>
				</nav>
			</div>

			{/* Mobile-Style Feed Container */}
			<div
				ref={containerRef}
				className="relative w-full max-w-[500px] h-full mx-auto snap-y snap-mandatory overflow-y-scroll overflow-x-hidden hide-scrollbar shadow-2xl rounded-3xl border border-border bg-background/40 backdrop-blur-3xl"
				style={{ scrollBehavior: "smooth" }}
			>
				{/* Navigation Overlay */}
				<div className="absolute top-0 left-0 w-full p-6 z-50 flex justify-between items-start pointer-events-none">
					<Link href="/" className="pointer-events-auto">
						<div className="p-3 bg-glass backdrop-blur-xl border border-[var(--border-glass)] rounded-full text-foreground hover:bg-hover hover:scale-105 transition-all shadow-lg">
							<ArrowLeft className="w-5 h-5" />
						</div>
					</Link>
					<div className="flex gap-4 p-1.5 bg-background/40 backdrop-blur-xl border border-border rounded-full pointer-events-auto shadow-2xl">
						<div className="px-5 py-2 text-foreground/60 font-semibold text-sm hover:text-foreground transition-colors cursor-pointer rounded-full">
							Following
						</div>
						<div className="px-5 py-2 bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] text-[var(--text-on-accent)] font-bold text-sm rounded-full shadow-[var(--accent-glow)]">
							For You
						</div>
					</div>
				</div>

				{FEED_DATA.map((video, index) => (
					<div key={video.id} className="w-full h-full snap-start relative">
						<VideoPlayer {...video} isActive={index === activeIndex} />
					</div>
				))}
			</div>

		{/* eslint-disable-next-line react/no-unknown-property */}
			<style jsx global>{`
				.hide-scrollbar::-webkit-scrollbar {
					display: none;
				}
				.hide-scrollbar {
					-ms-overflow-style: none;
					scrollbar-width: none;
				}
			`}</style>
		</div>
	);
}
