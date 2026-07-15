/**
 * Render farm modal — displays the distributed render farm status
 * with node health and queue metrics.
 *
 * @module components/editor/RenderFarmModal
 */

"use client";

interface FarmNode {
	/** Node identifier. */
	node: string;
	/** Current render status text. */
	status: string;
	/** Render progress percentage. */
	progress: number;
}

interface RenderFarmModalProps {
	/** Whether the modal is visible. */
	isOpen: boolean;
	/** Array of farm node statuses. */
	farmProgress: FarmNode[];
}

export function RenderFarmModal({
	isOpen,
	farmProgress,
}: RenderFarmModalProps) {
	if (!isOpen) return null;

	return (
		<div className="absolute inset-0 z-[60] bg-background/90 backdrop-blur-xl flex items-center justify-center transition-opacity duration-300">
			<div className="bg-background border border-border/50 p-8 rounded-xl shadow-2xl w-[600px] flex flex-col relative overflow-hidden">
				<h3 className="text-foreground text-2xl font-bold mb-6 flex items-center gap-3">
					<svg
						className="w-8 h-8 text-blue-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
					Distributed Render Farm
				</h3>

				<div className="grid grid-cols-2 gap-4">
					{farmProgress.map((node: FarmNode) => (
						<div
							key={node.node}
							className="bg-background border border-border rounded-lg p-4 relative overflow-hidden"
						>
							<div className="flex justify-between items-center mb-2">
								<span className="text-sm font-medium text-foreground">
									Node {node.node}
								</span>
								<span
									className={`text-xs font-bold ${node.status === "Complete" ? "text-emerald-400" : "text-blue-400"}`}
								>
									{node.status}
								</span>
							</div>
							<div className="w-full bg-panel rounded-full h-1.5 overflow-hidden mb-1">
								<div
									className={`h-full transition-all duration-300 ${node.progress === 100 ? "bg-emerald-500" : "bg-blue-500"}`}
									style={{ width: `${node.progress}%` }}
								/>
							</div>
							<div className="text-right text-[10px] text-muted font-mono">
								{Math.round(node.progress)}%
							</div>
						</div>
					))}
				</div>

				<div className="mt-8 flex justify-center">
					{farmProgress.every((n: FarmNode) => n.progress === 100) ? (
						<div className="px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold border border-emerald-500/50">
							Render Complete
						</div>
					) : (
						<div className="flex items-center gap-2 text-muted text-sm">
							<svg
								className="w-4 h-4 animate-spin text-blue-500"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Processing across 4 Cloud Nodes...
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
