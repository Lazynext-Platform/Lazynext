import React, { useEffect, useRef } from "react";
// import { useWasm } from "@/hooks/use-wasm";

export function WaveformScope() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	// const { gpu } = useWasm();

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		let animationFrame: number;

		const renderLoop = () => {
			ctx.fillStyle = "#111";
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// In a real implementation:
			// const histogram = gpu.analyze_waveform();
			// Draw the histogram bars based on the GPU atomic counters

			// Waveform visualization — draw grid + axes until real GPU data is available
			ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
			for (let i = 0; i < 16; i++) {
				const y = (canvas.height / 16) * i;
				ctx.fillRect(0, y, canvas.width, 1);
			}

			animationFrame = requestAnimationFrame(renderLoop);
		};

		renderLoop();

		return () => cancelAnimationFrame(animationFrame);
	}, []);

	return (
		<div className="flex flex-col bg-background border border-border rounded p-2 m-2">
			<span className="text-xs text-muted font-mono mb-2 uppercase tracking-widest">
				Waveform Monitor
			</span>
			<canvas
				ref={canvasRef}
				width={512}
				height={200}
				className="bg-background w-full h-[150px] rounded"
			/>
		</div>
	);
}
