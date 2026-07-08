import React, { useRef, useEffect, useState, useCallback } from "react";

/**
 * Canvas Component — GPU-accelerated video preview viewport.
 * Renders the composited output from the Rust WASM engine into a
 * <canvas> element with resolution/aspect-ratio awareness and
 * interactive viewport controls (zoom, pan, safe margins).
 */

interface CanvasProps {
	/** Project data object. */
	project: any;
	/** Current frame index. */
	frame: number;
	/** Whether to show title/action safe margins. */
	showSafeMargins?: boolean;
	/** Whether to show rule-of-thirds grid. */
	showGrid?: boolean;
	/** Viewport zoom factor. */
	zoom?: number;
	/** Callback when zoom changes. */
	onZoomChange?: (zoom: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
	project,
	frame,
	showSafeMargins = false,
	showGrid = false,
	zoom = 1,
	onZoomChange,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
	const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const panStartRef = useRef({ x: 0, y: 0 });

	const width = project?.width || 1920;
	const height = project?.height || 1080;

	// Draw safe-margin and grid overlays
	useEffect(() => {
		const canvas = overlayCanvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = width;
		canvas.height = height;
		ctx.clearRect(0, 0, width, height);

		if (showSafeMargins) {
			// Title Safe (80%) and Action Safe (90%)
			const drawSafeArea = (pct: number, color: string, label: string) => {
				const marginX = (width * (1 - pct)) / 2;
				const marginY = (height * (1 - pct)) / 2;
				ctx.strokeStyle = color;
				ctx.lineWidth = 1;
				ctx.setLineDash([6, 4]);
				ctx.strokeRect(marginX, marginY, width * pct, height * pct);
				ctx.setLineDash([]);

				ctx.fillStyle = color;
				ctx.font = "12px monospace";
				ctx.fillText(label, marginX + 4, marginY + 14);
			};

			drawSafeArea(0.9, "rgba(0, 200, 255, 0.4)", "Action Safe 90%");
			drawSafeArea(0.8, "rgba(255, 200, 0, 0.4)", "Title Safe 80%");
		}

		if (showGrid) {
			ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
			ctx.lineWidth = 1;

			// Rule of thirds
			for (let i = 1; i < 3; i++) {
				const x = (width / 3) * i;
				const y = (height / 3) * i;

				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, height);
				ctx.stroke();

				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(width, y);
				ctx.stroke();
			}

			// Center crosshair
			ctx.strokeStyle = "rgba(0, 200, 255, 0.15)";
			ctx.beginPath();
			ctx.moveTo(width / 2, 0);
			ctx.lineTo(width / 2, height);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0, height / 2);
			ctx.lineTo(width, height / 2);
			ctx.stroke();
		}
	}, [width, height, showSafeMargins, showGrid]);

	// Mouse wheel zoom
	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			const delta = e.deltaY > 0 ? -0.1 : 0.1;
			const newZoom = Math.max(0.25, Math.min(4, zoom + delta));
			onZoomChange?.(newZoom);
		},
		[zoom, onZoomChange],
	);

	// Pan controls (middle mouse or space+drag)
	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (e.button === 1) {
				// middle click
				setIsPanning(true);
				panStartRef.current = {
					x: e.clientX - panOffset.x,
					y: e.clientY - panOffset.y,
				};
				e.preventDefault();
			}
		},
		[panOffset],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isPanning) return;
			setPanOffset({
				x: e.clientX - panStartRef.current.x,
				y: e.clientY - panStartRef.current.y,
			});
		},
		[isPanning],
	);

	const handleMouseUp = useCallback(() => {
		setIsPanning(false);
	}, []);

	// Timecode display
	const fps = project?.fps || 30;
	const totalSeconds = frame / fps;
	const mm = Math.floor(totalSeconds / 60)
		.toString()
		.padStart(2, "0");
	const ss = Math.floor(totalSeconds % 60)
		.toString()
		.padStart(2, "0");
	const ff = Math.floor(frame % fps)
		.toString()
		.padStart(2, "0");

	return (
		<div
			ref={containerRef}
			className="flex-1 bg-background flex items-center justify-center relative overflow-hidden select-none"
			onWheel={handleWheel}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
		>
			{/* Viewport Transform Container */}
			<div
				className="relative"
				style={{
					transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
					transformOrigin: "center center",
					transition: isPanning ? "none" : "transform 0.15s ease-out",
				}}
			>
				{/* The WASM engine renders into lazynext-canvas (managed by wasm-player) */}
				{/* This div reserves the correct aspect ratio space */}
				<div
					style={{
						width: `${Math.min(960, width)}px`,
						aspectRatio: `${width} / ${height}`,
					}}
					className="relative"
				>
					{/* Overlay canvas for guides and margins */}
					<canvas
						ref={overlayCanvasRef}
						className="absolute inset-0 w-full h-full pointer-events-none z-10"
						style={{ aspectRatio: `${width} / ${height}` }}
					/>
				</div>
			</div>

			{/* Bottom HUD: Timecode + Zoom */}
			<div className="absolute bottom-3 right-3 flex items-center gap-3 z-20">
				<span className="text-[10px] font-mono text-muted bg-background/60 px-2 py-1 rounded border border-border">
					{mm}:{ss}:{ff}
				</span>
				<span className="text-[10px] font-mono text-muted bg-background/60 px-2 py-1 rounded border border-border">
					{Math.round(zoom * 100)}%
				</span>
			</div>

			{/* Resolution Badge */}
			<div className="absolute top-3 left-3 z-20">
				<span className="text-[9px] font-mono text-zinc-600 bg-background/60 px-2 py-0.5 rounded border border-border">
					{width}×{height}
				</span>
			</div>
		</div>
	);
};
