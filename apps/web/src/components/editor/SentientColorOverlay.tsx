/**
 * Sentient Color overlay — AI-driven color grading overlay with
 * real-time adjustment controls.
 *
 * @module components/editor/SentientColorOverlay
 */

"use client";

interface SentientColorOverlayProps {
	/** Whether the color overlay is currently active. */
	isActive: boolean;
}

export function SentientColorOverlay({ isActive }: SentientColorOverlayProps) {
	if (!isActive) return null;

	return (
		<div className="absolute top-20 right-4 z-50 bg-background/80 backdrop-blur-md border border-rose-500/50 rounded-lg p-3 w-56 shadow-[0_0_20px_rgba(225,29,72,0.3)] pointer-events-none">
			<div className="flex items-center justify-between mb-3">
				<span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">
					Sentient Color
				</span>
				<div className="flex gap-1">
					<div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
					<div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse delay-75" />
					<div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse delay-150" />
				</div>
			</div>
			<div className="flex items-center justify-center mb-4 relative">
				<div
					className="w-24 h-24 rounded-full border-4 border-border relative overflow-hidden"
					style={{
						background:
							"conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
					}}
				>
					<div className="absolute top-1/2 left-1/2 w-10 h-[2px] bg-white origin-left -rotate-45 shadow-[0_0_5px_white]" />
					<div className="absolute top-1/2 left-1/2 w-10 h-[2px] bg-white origin-left rotate-135 shadow-[0_0_5px_white]" />
				</div>
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="w-8 h-8 rounded-full bg-background shadow-inner" />
				</div>
			</div>
			<div className="space-y-2">
				<div className="flex gap-1 h-6 rounded overflow-hidden">
					<div className="flex-1 bg-rose-500" />
					<div className="flex-1 bg-orange-400" />
					<div className="flex-1 bg-sky-500" />
					<div className="flex-1 bg-indigo-600" />
				</div>
				<div className="flex justify-between items-center text-[10px]">
					<span className="text-muted">Harmony Profile</span>
					<span className="text-foreground font-medium">
						Split-Complementary
					</span>
				</div>
				<div className="flex justify-between items-center text-[10px]">
					<span className="text-muted">Emotional Resonance</span>
					<span className="text-rose-400 font-medium">Energetic</span>
				</div>
			</div>
		</div>
	);
}
