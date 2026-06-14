import React from "react";
import { Layers, Crosshair, Sparkles, Film } from "lucide-react";

export function VFXCompositor({
	updateSelectedClip,
	selectedClip,
}: {
	updateSelectedClip: any;
	selectedClip: any;
}) {
	if (!selectedClip) {
		return (
			<div className="flex-1 flex items-center justify-center text-zinc-500 text-xs text-center p-4">
				Select a clip on the timeline to apply VFX and tracking.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{/* Physical Film Emulation */}
			<div className="bg-zinc-950 p-4 rounded-lg border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)] relative overflow-hidden">
				<div className="absolute top-0 right-0 p-1.5 bg-red-500 text-[9px] font-bold text-white rounded-bl-lg">
					PRO
				</div>
				<div className="flex items-center gap-2 mb-3">
					<Film className="w-4 h-4 text-red-400" />
					<h3 className="text-sm font-semibold text-zinc-200">
						Film Emulation
					</h3>
				</div>
				<p className="text-[10px] text-zinc-500 mb-4">
					Kodak 2383 chemical and physical characteristics.
				</p>

				<div className="space-y-3">
					<div>
						<div className="flex justify-between text-[10px] text-zinc-400 mb-1">
							<span>Halation (Red Glow)</span>
							<span>45%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							defaultValue="45"
							className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
						/>
					</div>
					<div>
						<div className="flex justify-between text-[10px] text-zinc-400 mb-1">
							<span>Gate Weave (Jitter)</span>
							<span>12%</span>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							defaultValue="12"
							className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
						/>
					</div>
					<div>
						<div className="flex justify-between text-[10px] text-zinc-400 mb-1">
							<span>Tungsten Grain</span>
							<span>ISO 800</span>
						</div>
						<input
							type="range"
							min="100"
							max="3200"
							defaultValue="800"
							className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
						/>
					</div>
				</div>
			</div>

			{/* Planar Tracking Section */}
			<div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 shadow-inner">
				<div className="flex items-center gap-2 mb-3">
					<Crosshair className="w-4 h-4 text-emerald-400" />
					<h3 className="text-sm font-semibold text-zinc-200">
						Planar Tracking
					</h3>
				</div>

				<div className="flex gap-2">
					<button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium py-1.5 rounded border border-zinc-700 transition-colors">
						Track Forward
					</button>
					<button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium py-1.5 rounded border border-zinc-700 transition-colors">
						Track Backward
					</button>
				</div>
			</div>

			{/* Particle Systems Section */}
			<div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 shadow-inner">
				<div className="flex items-center gap-2 mb-3">
					<Sparkles className="w-4 h-4 text-orange-400" />
					<h3 className="text-sm font-semibold text-zinc-200">
						Particle Emitters
					</h3>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-center cursor-pointer hover:border-orange-500 transition-colors group">
						<div className="text-lg mb-1 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform">
							🔥
						</div>
						<span className="text-[10px] font-medium text-zinc-400 group-hover:text-white">
							Fire
						</span>
					</div>
					<div className="bg-zinc-900 border border-zinc-800 rounded p-3 text-center cursor-pointer hover:border-zinc-400 transition-colors group">
						<div className="text-lg mb-1 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-transform">
							💨
						</div>
						<span className="text-[10px] font-medium text-zinc-400 group-hover:text-white">
							Smoke
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
