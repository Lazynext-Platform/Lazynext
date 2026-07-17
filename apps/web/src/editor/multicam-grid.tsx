/**
 * Multi-camera angle grid for live switching during playback.
 *
 * Renders four camera angles (Wide, Close up, Over shoulder, Drone) as a
 * 2x2 grid. Pressing keys 1–4 triggers a live cut on the WASM engine.
 * Active angle is highlighted with a red border and REC indicator.
 *
 * @module editor/multicam-grid
 */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import { useWasm } from "@/hooks/use-wasm";
import { wasmBridge } from "@/core/wasm-bridge";

/**
 * Multi-camera angle grid component.
 *
 * Displays four camera angles in a 2x2 grid. Keyboard shortcuts 1-4
 * perform live cuts via the WASM compositor. The active angle is
 * rendered through the WGPU bridge.
 */
export function MulticamGrid() {
	const [activeAngle, setActiveAngle] = useState(0);
	const { time, frame, isReady } = useWasm();
	const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

	// Render WGPU output to the active camera angle
	useEffect(() => {
		if (isReady && canvasRefs.current[activeAngle]) {
			wasmBridge.renderToCanvas(canvasRefs.current[activeAngle]!, frame).catch(console.error);
		}
	}, [isReady, frame, activeAngle]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (["1", "2", "3", "4"].includes(e.key)) {
				const angle = parseInt(e.key) - 1;
				setActiveAngle(angle);

				// Execute WASM Binding:
				time.trigger_live_cut(angle, frame);
				console.log(
					`Live cut triggered to Camera ${angle + 1} at frame ${frame}!`,
				);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const angles = [
		"CAM A (Wide)",
		"CAM B (Close up)",
		"CAM C (Over shoulder)",
		"CAM D (Drone)",
	];

	return (
		<div className="grid grid-cols-2 gap-2 p-4 bg-background border border-gray-800 rounded">
			{angles.map((label, idx) => (
				<div
					key={idx}
					className={`relative w-full aspect-video flex items-center justify-center rounded border-2 transition-all ${
						activeAngle === idx
							? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]"
							: "border-border"
					}`}
				>
					<span className="text-muted font-mono text-sm">{label}</span>
					<canvas
						ref={(el) => {
							canvasRefs.current[idx] = el;
						}}
						width={640}
						height={360}
						className={`absolute inset-0 w-full h-full object-contain ${activeAngle !== idx ? "opacity-30 grayscale" : "opacity-100"}`}
					/>
					<div className="absolute top-2 left-2 bg-background bg-opacity-70 px-2 py-1 rounded text-xs text-foreground font-bold z-10">
						{idx + 1}
					</div>
					{activeAngle === idx && (
						<div className="absolute top-2 right-2 bg-[#00e5ff] px-2 py-1 rounded text-xs text-background font-bold animate-pulse z-10">
							REC
						</div>
					)}
				</div>
			))}
		</div>
	);
}
