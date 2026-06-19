"use client";

import React from "react";

interface BezierEditorState {
	isOpen: boolean;
	trackIdx?: number;
	clipIdx?: number;
	property?: string;
	frame?: number;
	curve: number[];
}

interface BezierEditorModalProps {
	bezierEditor: BezierEditorState | null;
	setBezierEditor: React.Dispatch<
		React.SetStateAction<BezierEditorState | null>
	>;
	projectData: any;
	commitState: (data: any) => void;
}

export function BezierEditorModal({
	bezierEditor,
	setBezierEditor,
	projectData,
	commitState,
}: BezierEditorModalProps) {
	if (!bezierEditor) return null;

	const handleSaveCurve = () => {
		const newProject = JSON.parse(JSON.stringify(projectData));
		const clip =
			newProject.tracks[bezierEditor.trackIdx!]?.clips?.[bezierEditor.clipIdx!];
		const kf = clip?.keyframes?.find(
			(k: any) =>
				k.property === bezierEditor.property &&
				Math.abs(k.frame - bezierEditor.frame!) < 0.5,
		);
		if (kf) {
			kf.bezierCurve = bezierEditor.curve;
			commitState(newProject);
		}
		setBezierEditor(null);
	};

	return (
		<div className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
			<div className="bg-background border border-border/50 rounded-xl shadow-2xl p-6 w-[400px] flex flex-col relative overflow-hidden">
				<div className="flex justify-between items-center mb-4 border-b border-border pb-3">
					<h3 className="text-foreground font-medium text-sm flex items-center gap-2">
						<svg
							className="w-4 h-4 text-indigo-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
							/>
						</svg>
						Graph Editor: {bezierEditor.property}
					</h3>
					<button
						onClick={() => setBezierEditor(null)}
						className="text-muted hover:text-foreground transition-colors"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="relative w-full aspect-square bg-background border border-border rounded-lg mb-6 group overflow-hidden">
					<svg
						className="w-full h-full absolute inset-0 pointer-events-none"
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
					>
						<line
							x1="0"
							y1="25"
							x2="100"
							y2="25"
							stroke="#27272a"
							strokeWidth="1"
						/>
						<line
							x1="0"
							y1="50"
							x2="100"
							y2="50"
							stroke="#27272a"
							strokeWidth="1"
						/>
						<line
							x1="0"
							y1="75"
							x2="100"
							y2="75"
							stroke="#27272a"
							strokeWidth="1"
						/>
						<line
							x1="25"
							y1="0"
							x2="25"
							y2="100"
							stroke="#27272a"
							strokeWidth="1"
						/>
						<line
							x1="50"
							y1="0"
							x2="50"
							y2="100"
							stroke="#27272a"
							strokeWidth="1"
						/>
						<line
							x1="75"
							y1="0"
							x2="75"
							y2="100"
							stroke="#27272a"
							strokeWidth="1"
						/>

						<path
							d={`M0 100 C ${bezierEditor.curve[0] * 100} ${100 - bezierEditor.curve[1] * 100}, ${bezierEditor.curve[2] * 100} ${100 - bezierEditor.curve[3] * 100}, 100 0`}
							fill="none"
							stroke="#6366f1"
							strokeWidth="3"
							className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]"
						/>

						<line
							x1="0"
							y1="100"
							x2={bezierEditor.curve[0] * 100}
							y2={100 - bezierEditor.curve[1] * 100}
							stroke="#a1a1aa"
							strokeWidth="1"
							strokeDasharray="4 2"
						/>
						<line
							x1="100"
							y1="0"
							x2={bezierEditor.curve[2] * 100}
							y2={100 - bezierEditor.curve[3] * 100}
							stroke="#a1a1aa"
							strokeWidth="1"
							strokeDasharray="4 2"
						/>
						<circle
							cx={bezierEditor.curve[0] * 100}
							cy={100 - bezierEditor.curve[1] * 100}
							r="3"
							fill="#6366f1"
						/>
						<circle
							cx={bezierEditor.curve[2] * 100}
							cy={100 - bezierEditor.curve[3] * 100}
							r="3"
							fill="#ec4899"
						/>
					</svg>
				</div>

				<div className="grid grid-cols-2 gap-4 mb-4">
					<div className="flex flex-col gap-2 p-3 bg-panel/50 rounded-lg border border-border/50">
						<span className="text-xs text-indigo-400 font-semibold mb-1">
							Point 1
						</span>
						<div className="flex items-center justify-between">
							<span className="text-[10px] text-muted w-4">X</span>
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								value={bezierEditor.curve[0]}
								onChange={(e) =>
									setBezierEditor((prev: BezierEditorState | null) =>
										prev
											? {
													...prev,
													curve: [
														parseFloat(e.target.value),
														prev.curve[1],
														prev.curve[2],
														prev.curve[3],
													],
												}
											: null,
									)
								}
								className="flex-1 accent-indigo-500 mx-2 h-1"
							/>
							<span className="text-[10px] text-foreground w-6">
								{bezierEditor.curve[0].toFixed(2)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[10px] text-muted w-4">Y</span>
							<input
								type="range"
								min="-0.5"
								max="1.5"
								step="0.01"
								value={bezierEditor.curve[1]}
								onChange={(e) =>
									setBezierEditor((prev: BezierEditorState | null) =>
										prev
											? {
													...prev,
													curve: [
														prev.curve[0],
														parseFloat(e.target.value),
														prev.curve[2],
														prev.curve[3],
													],
												}
											: null,
									)
								}
								className="flex-1 accent-indigo-500 mx-2 h-1"
							/>
							<span className="text-[10px] text-foreground w-6">
								{bezierEditor.curve[1].toFixed(2)}
							</span>
						</div>
					</div>

					<div className="flex flex-col gap-2 p-3 bg-panel/50 rounded-lg border border-border/50">
						<span className="text-xs text-pink-400 font-semibold mb-1">
							Point 2
						</span>
						<div className="flex items-center justify-between">
							<span className="text-[10px] text-muted w-4">X</span>
							<input
								type="range"
								min="0"
								max="1"
								step="0.01"
								value={bezierEditor.curve[2]}
								onChange={(e) =>
									setBezierEditor((prev: BezierEditorState | null) =>
										prev
											? {
													...prev,
													curve: [
														prev.curve[0],
														prev.curve[1],
														parseFloat(e.target.value),
														prev.curve[3],
													],
												}
											: null,
									)
								}
								className="flex-1 accent-pink-500 mx-2 h-1"
							/>
							<span className="text-[10px] text-foreground w-6">
								{bezierEditor.curve[2].toFixed(2)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[10px] text-muted w-4">Y</span>
							<input
								type="range"
								min="-0.5"
								max="1.5"
								step="0.01"
								value={bezierEditor.curve[3]}
								onChange={(e) =>
									setBezierEditor((prev: BezierEditorState | null) =>
										prev
											? {
													...prev,
													curve: [
														prev.curve[0],
														prev.curve[1],
														prev.curve[2],
														parseFloat(e.target.value),
													],
												}
											: null,
									)
								}
								className="flex-1 accent-pink-500 mx-2 h-1"
							/>
							<span className="text-[10px] text-foreground w-6">
								{bezierEditor.curve[3].toFixed(2)}
							</span>
						</div>
					</div>
				</div>

				<button
					className="w-full bg-indigo-600 hover:bg-indigo-500 text-foreground font-medium py-2 rounded transition-colors"
					onClick={handleSaveCurve}
				>
					Save Curve
				</button>
			</div>
		</div>
	);
}
