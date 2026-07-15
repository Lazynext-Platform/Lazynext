/**
 * Neural Cinema overlay — AI-powered cinematic style overlay
 * with real-time neural rendering status.
 *
 * @module components/editor/NeuralCinemaOverlay
 */

"use client";

interface NeuralCinemaOverlayProps {
	/** Whether the neural cinema overlay is visible. */
	isActive: boolean;
}

export function NeuralCinemaOverlay({ isActive }: NeuralCinemaOverlayProps) {
	if (!isActive) return null;

	return (
		<>
			<div className="absolute top-4 left-4 z-50 bg-background/80 backdrop-blur-md border border-cyan-500/50 rounded-lg p-3 w-64 shadow-[0_0_20px_rgba(6,182,212,0.3)] pointer-events-none">
				<div className="flex items-center justify-between mb-2">
					<span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">
						Neural Cinema AI
					</span>
					<div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
				</div>
				<div className="space-y-2">
					<div className="flex justify-between items-center text-xs">
						<span className="text-muted">Shot Type</span>
						<span className="text-foreground font-medium">Medium Close-Up</span>
					</div>
					<div className="flex justify-between items-center text-xs">
						<span className="text-muted">Subject Focus</span>
						<span className="text-foreground font-medium text-emerald-400">
							Locked (Center)
						</span>
					</div>
					<div className="flex justify-between items-center text-xs">
						<span className="text-muted">Cinematic Score</span>
						<span className="text-foreground font-medium text-yellow-400">
							8.9 / 10
						</span>
					</div>
					<div className="w-full h-1 bg-panel rounded overflow-hidden mt-1">
						<div className="h-full bg-gradient-to-r from-yellow-500 to-emerald-500 w-[89%]" />
					</div>
				</div>
			</div>
			<div className="absolute inset-0 pointer-events-none z-[35] flex items-center justify-center mix-blend-screen opacity-50">
				<div className="w-full h-full border border-cyan-500/30 grid grid-cols-3 grid-rows-3 relative">
					<div className="border-r border-cyan-500/30 h-full" />
					<div className="border-r border-cyan-500/30 h-full" />
					<div />
					<div className="absolute top-1/3 left-0 w-full border-b border-cyan-500/30" />
					<div className="absolute top-2/3 left-0 w-full border-b border-cyan-500/30" />
					<div className="absolute top-1/3 left-1/3 w-2 h-2 rounded-full bg-cyan-400 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(34,211,238,1)]" />
					<div className="absolute top-1/3 left-2/3 w-2 h-2 rounded-full bg-cyan-400 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(34,211,238,1)]" />
					<div className="absolute top-2/3 left-1/3 w-2 h-2 rounded-full bg-cyan-400 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(34,211,238,1)]" />
					<div className="absolute top-2/3 left-2/3 w-2 h-2 rounded-full bg-cyan-400 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(34,211,238,1)]" />
				</div>
			</div>
		</>
	);
}
