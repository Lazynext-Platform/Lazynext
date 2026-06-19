import React from "react";
import { Type, Play } from "lucide-react";

export function TextPresets({
	onAddPreset,
}: {
	onAddPreset: (preset: any) => void;
}) {
	const presets = [
		{
			id: "kinetic",
			name: "Kinetic Bounce",
			icon: "🪀",
			bg: "bg-indigo-600/20",
		},
		{ id: "typewriter", name: "Typewriter", icon: "⌨️", bg: "bg-panel" },
		{ id: "neon", name: "Neon Glow", icon: "🚥", bg: "bg-fuchsia-600/20" },
		{ id: "glitch", name: "Cyber Glitch", icon: "⚡", bg: "bg-cyan-600/20" },
		{
			id: "subtitle",
			name: "Pop Subtitle",
			icon: "💬",
			bg: "bg-yellow-600/20",
		},
		{ id: "credits", name: "Rolling Credits", icon: "🎬", bg: "bg-background" },
	];

	return (
		<div className="flex flex-col h-full bg-background overflow-y-auto custom-scrollbar p-2">
			<div className="grid grid-cols-2 gap-2">
				{presets.map((preset) => (
					// eslint-disable-next-line jsx-a11y/no-static-element-interactions
					// eslint-disable-next-line jsx-a11y/click-events-have-key-events
					<div
						key={preset.id}
						onClick={() =>
							onAddPreset({
								type: "text",
								name: preset.name,
								duration_frames: 120,
								presetId: preset.id,
							})
						}
						className="flex flex-col items-center justify-center p-4 border border-border rounded-lg bg-background hover:border-zinc-500 cursor-pointer transition-all hover:scale-[1.02] group"
					>
						<div
							className={`w-12 h-12 rounded-full ${preset.bg} flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform relative`}
						>
							{preset.icon}
							<div className="absolute inset-0 bg-background/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
								<Play className="w-4 h-4 text-foreground fill-white" />
							</div>
						</div>
						<span className="text-[10px] font-semibold text-foreground text-center">
							{preset.name}
						</span>
					</div>
				))}
			</div>

			<div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
				<h4 className="text-[10px] font-bold text-indigo-400 uppercase mb-1">
					Custom Font Engine
				</h4>
				<p className="text-[10px] text-muted">
					Import .TTF or .OTF files directly into the WebGL text renderer for
					custom brand typography.
				</p>
				<button className="mt-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] text-foreground rounded font-medium transition-colors">
					Upload Font...
				</button>
			</div>
		</div>
	);
}
