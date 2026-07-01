/**
 * Audio mixer panel — per-track volume sliders, mute/solo controls,
 * and master output management.
 *
 * @module components/editor/panels/audio-mixer
 */

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Sliders } from "lucide-react";

export function AudioMixer({
	projectData,
	setProjectData,
}: {
	projectData: any;
	setProjectData: any;
}) {
	const [meters, setMeters] = useState<Record<string, number>>({});

	// Simulate audio metering
	useEffect(() => {
		const interval = setInterval(() => {
			const newMeters: Record<string, number> = {};
			projectData.tracks?.forEach((t: any) => {
				if (t.type === "audio" || t.type === "video") {
					// Random meter bounce between -60dB and 0dB if not muted
					newMeters[t.id] = t.isMuted ? -60 : Math.random() * 40 - 45;
				}
			});
			// Master meter
			newMeters["master_left"] = Math.random() * 30 - 35;
			newMeters["master_right"] = Math.random() * 30 - 35;
			setMeters(newMeters);
		}, 100);

		return () => clearInterval(interval);
	}, [projectData]);

	const audioTracks =
		projectData.tracks?.filter(
			(t: any) => t.type === "audio" || t.type === "video",
		) || [];

	const handleVolumeChange = (trackId: string, volume: number) => {
		setProjectData({
			...projectData,
			tracks: projectData.tracks.map((t: any) =>
				t.id === trackId ? { ...t, volume } : t,
			),
		});
	};

	const handleMuteToggle = (trackId: string) => {
		setProjectData({
			...projectData,
			tracks: projectData.tracks.map((t: any) =>
				t.id === trackId ? { ...t, isMuted: !t.isMuted } : t,
			),
		});
	};

	return (
		<div className="flex bg-background border border-border rounded-lg overflow-x-auto overflow-y-hidden h-64 shadow-xl">
			<div className="flex items-center justify-center p-2 border-r border-border bg-background/50 min-w-[40px]">
				<span
					className="text-muted font-bold text-[10px] uppercase tracking-widest"
					style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
				>
					Fairlight Mixer
				</span>
			</div>

			{/* Track Faders */}
			<div className="flex flex-1 p-2 gap-4">
				{audioTracks.map((track: any, idx: number) => (
					<div
						key={track.id}
						className="flex flex-col items-center min-w-[80px] bg-background rounded-lg p-2 border border-border"
					>
						<span className="text-[10px] text-foreground font-mono truncate w-full text-center">
							{track.name || `A${idx + 1}`}
						</span>

						<div className="flex-1 flex gap-2 my-2 relative">
							{/* Meter */}
							<div className="w-2 h-full bg-background rounded-full overflow-hidden flex flex-col justify-end">
								<div
									className="w-full transition-all duration-75"
									style={{
										height: `${Math.max(0, Math.min(100, (((meters[track.id] || -60) + 60) / 60) * 100))}%`,
										backgroundColor:
											(meters[track.id] || -60) > -6
												? "#ef4444"
												: (meters[track.id] || -60) > -18
													? "#eab308"
													: "#22c55e",
									}}
								/>
							</div>

							{/* Fader Track */}
							<div className="w-4 h-full bg-background rounded-full relative group">
								<input
									type="range"
									min="0"
									max="2"
									step="0.01"
									value={track.volume ?? 1}
									onChange={(e) =>
										handleVolumeChange(track.id, parseFloat(e.target.value))
									}
									className="absolute inset-0 w-full h-full appearance-none bg-transparent origin-center -rotate-90 translate-y-[calc(50%-8px)]"
									style={{ width: "150px", left: "-67px", top: "10px" }} // CSS rotation hacks for vertical slider
								/>
								<div
									className="absolute left-1/2 -translate-x-1/2 w-6 h-3 bg-zinc-600 rounded cursor-pointer pointer-events-none group-hover:bg-zinc-500 border border-zinc-400"
									style={{ bottom: `${((track.volume ?? 1) / 2) * 100}%` }}
								/>
							</div>
						</div>

						<div className="flex gap-1 w-full justify-center">
							<button
								onClick={() => handleMuteToggle(track.id)}
								className={`w-6 h-6 rounded flex items-center justify-center ${track.isMuted ? "bg-red-900/50 text-red-400 border border-red-700" : "bg-panel text-muted hover:text-foreground border border-transparent hover:border-border"}`}
							>
								{track.isMuted ? (
									<VolumeX className="w-3 h-3" />
								) : (
									<Volume2 className="w-3 h-3" />
								)}
							</button>
						</div>
						<span className="text-[9px] font-mono text-muted mt-1">
							{track.volume ? track.volume.toFixed(2) : "1.00"}
						</span>
					</div>
				))}
			</div>

			{/* Master Fader */}
			<div className="flex flex-col items-center min-w-[90px] bg-background p-2 border-l border-border">
				<span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-2">
					Master
				</span>
				<div className="flex-1 flex gap-2 mb-2 relative">
					{/* L/R Meters */}
					<div className="flex gap-[1px]">
						<div className="w-2 h-full bg-background rounded-sm overflow-hidden flex flex-col justify-end">
							<div
								className="w-full transition-all duration-75"
								style={{
									height: `${Math.max(0, Math.min(100, (((meters["master_left"] || -60) + 60) / 60) * 100))}%`,
									backgroundColor:
										(meters["master_left"] || -60) > -6
											? "#ef4444"
											: (meters["master_left"] || -60) > -18
												? "#eab308"
												: "#22c55e",
								}}
							/>
						</div>
						<div className="w-2 h-full bg-background rounded-sm overflow-hidden flex flex-col justify-end">
							<div
								className="w-full transition-all duration-75"
								style={{
									height: `${Math.max(0, Math.min(100, (((meters["master_right"] || -60) + 60) / 60) * 100))}%`,
									backgroundColor:
										(meters["master_right"] || -60) > -6
											? "#ef4444"
											: (meters["master_right"] || -60) > -18
												? "#eab308"
												: "#22c55e",
								}}
							/>
						</div>
					</div>
					{/* Master Fader Track */}
					<div className="w-4 h-full bg-background rounded-full relative group">
						<input
							type="range"
							min="0"
							max="2"
							step="0.01"
							defaultValue="1"
							className="absolute inset-0 w-full h-full appearance-none bg-transparent origin-center -rotate-90 translate-y-[calc(50%-8px)]"
							style={{ width: "150px", left: "-67px", top: "10px" }}
						/>
						<div
							className="absolute left-1/2 -translate-x-1/2 w-8 h-4 bg-red-900 rounded cursor-pointer pointer-events-none group-hover:bg-red-800 border border-red-500"
							style={{ bottom: "50%" }}
						/>
					</div>
				</div>
				<div className="flex gap-1 w-full justify-center">
					<button className="w-full h-6 rounded flex items-center justify-center bg-panel text-muted hover:text-foreground border border-transparent hover:border-border">
						<Sliders className="w-3 h-3 mr-1" />{" "}
						<span className="text-[9px]">EQ</span>
					</button>
				</div>
			</div>
		</div>
	);
}
