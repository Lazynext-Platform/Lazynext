import React, { useEffect, useRef, useState } from "react";

export function LumetriScopes({
	sourceCanvasRef,
}: {
	sourceCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}) {
	const waveformRef = useRef<HTMLCanvasElement>(null);
	const vectorscopeRef = useRef<HTMLCanvasElement>(null);
	const [activeScope, setActiveScope] = useState<"waveform" | "vectorscope">(
		"waveform",
	);

	useEffect(() => {
		let animationFrameId: number;

		const drawScopes = () => {
			const srcCanvas = sourceCanvasRef.current;
			const waveCanvas = waveformRef.current;
			const vecCanvas = vectorscopeRef.current;

			if (!srcCanvas || !waveCanvas || !vecCanvas) {
				animationFrameId = requestAnimationFrame(drawScopes);
				return;
			}

			const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
			if (!srcCtx) return;

			// Downsample for performance
			const w = srcCanvas.width;
			const h = srcCanvas.height;
			if (w === 0 || h === 0) {
				animationFrameId = requestAnimationFrame(drawScopes);
				return;
			}

			const sampleW = 256;
			const sampleH = 144;

			// Temporary canvas to get image data
			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = sampleW;
			tempCanvas.height = sampleH;
			const tempCtx = tempCanvas.getContext("2d");
			if (!tempCtx) return;

			tempCtx.drawImage(srcCanvas, 0, 0, sampleW, sampleH);
			const imgData = tempCtx.getImageData(0, 0, sampleW, sampleH);
			const data = imgData.data;

			if (activeScope === "waveform") {
				const ctx = waveCanvas.getContext("2d");
				if (!ctx) return;
				ctx.fillStyle = "#000000";
				ctx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);

				ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
				for (let x = 0; x < sampleW; x++) {
					for (let y = 0; y < sampleH; y++) {
						const i = (y * sampleW + x) * 4;
						const r = data[i];
						const g = data[i + 1];
						const b = data[i + 2];
						// Luma calculation
						const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

						// Map luma (0-255) to height
						const yPos = waveCanvas.height - (luma / 255) * waveCanvas.height;
						const xPos = (x / sampleW) * waveCanvas.width;

						ctx.fillRect(xPos, yPos, 1, 1);
					}
				}

				// Draw graticules (IRE lines)
				ctx.strokeStyle = "rgba(255,255,255,0.2)";
				ctx.fillStyle = "rgba(255,255,255,0.5)";
				ctx.font = "10px monospace";
				[0, 25, 50, 75, 100].forEach((ire) => {
					const yPos = waveCanvas.height - (ire / 100) * waveCanvas.height;
					ctx.beginPath();
					ctx.moveTo(0, yPos);
					ctx.lineTo(waveCanvas.width, yPos);
					ctx.stroke();
					ctx.fillText(ire.toString(), 2, yPos - 2);
				});
			} else {
				// Vectorscope
				const ctx = vecCanvas.getContext("2d");
				if (!ctx) return;
				ctx.fillStyle = "#000000";
				ctx.fillRect(0, 0, vecCanvas.width, vecCanvas.height);

				const cx = vecCanvas.width / 2;
				const cy = vecCanvas.height / 2;
				const radius = Math.min(cx, cy) - 10;

				// Draw graticule targets (R, Mg, B, Cy, G, Yl)
				ctx.strokeStyle = "rgba(255,255,255,0.2)";
				ctx.beginPath();
				ctx.arc(cx, cy, radius, 0, Math.PI * 2);
				ctx.stroke();

				ctx.fillStyle = "rgba(0, 255, 255, 0.1)";
				for (let i = 0; i < data.length; i += 4) {
					const r = data[i] / 255;
					const g = data[i + 1] / 255;
					const b = data[i + 2] / 255;

					// Convert to YCbCr roughly
					const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
					const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;

					const x = cx + cb * 2 * radius;
					const y = cy - cr * 2 * radius;

					ctx.fillRect(x, y, 1, 1);
				}
			}

			animationFrameId = requestAnimationFrame(drawScopes);
		};

		drawScopes();

		return () => {
			cancelAnimationFrame(animationFrameId);
		};
	}, [activeScope, sourceCanvasRef]);

	return (
		<div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden h-64 shadow-xl">
			<div className="flex border-b border-zinc-800 text-xs">
				<button
					className={`flex-1 py-2 font-medium ${activeScope === "waveform" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
					onClick={() => setActiveScope("waveform")}
				>
					Waveform (Luma)
				</button>
				<button
					className={`flex-1 py-2 font-medium ${activeScope === "vectorscope" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
					onClick={() => setActiveScope("vectorscope")}
				>
					Vectorscope
				</button>
			</div>
			<div className="flex-1 relative bg-black p-2">
				<canvas
					ref={waveformRef}
					width={400}
					height={200}
					className={`w-full h-full object-contain ${activeScope === "waveform" ? "block" : "hidden"}`}
				/>
				<canvas
					ref={vectorscopeRef}
					width={200}
					height={200}
					className={`w-full h-full object-contain ${activeScope === "vectorscope" ? "block" : "hidden"}`}
				/>
			</div>
		</div>
	);
}
