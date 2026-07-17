/**
 * Multicam grid panel — 2x2 camera angle switcher with live cut keys.
 *
 * @module components/editor/panels/multicam-grid
 */

import { useState } from "react";
import { LayoutGrid, CheckCircle2 } from "lucide-react";

/** React component rendering MulticamGrid. */
export function MulticamGrid({ isMulticamMode }: { isMulticamMode: boolean }) {
	const [activeCam, setActiveCam] = useState<number>(1);

	if (!isMulticamMode) return null;

	return (
		<div className="absolute inset-0 bg-background z-40 flex flex-col">
			<div className="h-8 bg-background border-b border-border flex items-center px-4 justify-between">
				<div className="flex items-center gap-2">
					<LayoutGrid className="w-3 h-3 text-red-500" />
					<span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
						Multicam Live Edit
					</span>
				</div>
				<span className="text-[10px] text-muted">
					Press 1-4 to switch angles
				</span>
			</div>

			<div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 bg-background p-1">
				{[1, 2, 3, 4].map((camNum) => (
					<div
						key={camNum}
						onClick={() => setActiveCam(camNum)}
						onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
						role="button"
						tabIndex={0}
						className={`relative bg-background border-2 rounded overflow-hidden cursor-pointer transition-colors ${activeCam === camNum ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "border-border hover:border-zinc-600"}`}
					>
						{/* Placeholder for camera feeds */}
						<div className="absolute inset-0 flex items-center justify-center text-zinc-800 text-6xl font-black">
							CAM {camNum}
						</div>

						{activeCam === camNum && (
							<div className="absolute top-2 right-2 bg-red-500 rounded-full p-1 shadow-lg">
								<CheckCircle2 className="w-4 h-4 text-foreground" />
							</div>
						)}

						<div className="absolute bottom-2 left-2 bg-background/80 px-2 py-0.5 rounded text-[10px] text-foreground font-mono border border-border/50">
							Angle {camNum}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
