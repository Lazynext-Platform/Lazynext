/**
 * Semantic Execution Contract visualizer.
 *
 * Displays CRDT operations as an auditable, linear script — every edit
 * is a deterministic, verifiable, and replayable operation log.
 *
 * @module editor/ExecutionContract
 */

import { useEditor } from "./use-editor";

interface CrdtOperation {
	/** Unique operation identifier. */
	id: string;
	/** Operation type name. */
	type: string;
	/** Operation arguments. */
	args: Record<string, any>;
	/** Execution status. */
	status: "pending" | "verified" | "failed" | "reused";
}

/**
 * Visualizes the Semantic Execution Contract.
 * Displays operations linearly as an auditable script.
 */
export const ExecutionContract: React.FC = () => {
	const { operations } = useEditor(); // Assuming useEditor provides the operation log

	return (
		<div className="flex flex-col bg-glass border border-white/10 rounded-lg p-4 font-mono text-sm overflow-y-auto max-h-96">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-foreground font-semibold text-xs uppercase tracking-wider">
					Semantic Execution Contract
				</h3>
				<span className="text-gray-500 text-xs">
					deterministic &bull; verifiable &bull; replayable
				</span>
			</div>

			<div className="flex flex-col gap-2">
				{operations && operations.length > 0 ? (
					operations.map((op: CrdtOperation, index: number) => (
						<div
							key={op.id}
							className="flex items-center justify-between group hover:bg-glass p-1 rounded transition-colors"
						>
							<div className="flex items-center gap-3">
								<span className="text-gray-600">
									op_{String(index + 1).padStart(2, "0")}
								</span>
								<span className="text-gray-300">
									<span className="text-blue-400">{op.type}</span>
									<span className="text-gray-500">(</span>
									<span className="text-muted">
										{Object.entries(op.args)
											.map(([k, v]) => `${k}=${JSON.stringify(v)}`)
											.join(", ")}
									</span>
									<span className="text-gray-500">)</span>
								</span>
							</div>
							<div>
								{op.status === "verified" && (
									<span className="text-green-500 text-xs">verified ✓</span>
								)}
								{op.status === "reused" && (
									<span className="text-blue-500 text-xs">reused</span>
								)}
								{op.status === "failed" && (
									<span className="text-red-500 text-xs">failed ✗</span>
								)}
								{op.status === "pending" && (
									<span className="text-yellow-500 text-xs animate-pulse">
										executing...
									</span>
								)}
							</div>
						</div>
					))
				) : (
					<div className="text-gray-600 italic">
						No operations recorded yet. Try Prompt Mode.
					</div>
				)}
			</div>

			<div className="mt-4 pt-4 border-t border-white/10 text-gray-500 text-xs">
				Every edit is an auditable spec — re-runnable byte-for-byte. The Entity
				Graph keeps style choices consistent.
			</div>
		</div>
	);
};
