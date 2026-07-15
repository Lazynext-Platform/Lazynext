/** @module Admin ResourceMonitor component showing GPU cluster health */

export function ResourceMonitor() {
	return (
		<div className="p-6 bg-[--bg-card] border border-[--border-primary] rounded-xl flex flex-col gap-4">
			<h3 className="font-semibold text-[--text-primary]">
				GPU Cluster Health
			</h3>

			<div className="space-y-4">
				<div>
					<div className="flex justify-between text-sm mb-1">
						<span className="text-[--text-secondary]">H100 Node A</span>
						<span className="text-[--accent-primary]">84%</span>
					</div>
					<div className="w-full bg-[--bg-main] rounded-full h-2">
						<div
							className="bg-[--accent-primary] h-2 rounded-full"
							style={{ width: "84%" }}
						/>
					</div>
				</div>

				<div>
					<div className="flex justify-between text-sm mb-1">
						<span className="text-[--text-secondary]">A100 Node B</span>
						<span className="text-yellow-400">92%</span>
					</div>
					<div className="w-full bg-[--bg-main] rounded-full h-2">
						<div
							className="bg-yellow-400 h-2 rounded-full"
							style={{ width: "92%" }}
						/>
					</div>
				</div>

				<div>
					<div className="flex justify-between text-sm mb-1">
						<span className="text-[--text-secondary]">A100 Node C</span>
						<span className="text-[--text-secondary]">12%</span>
					</div>
					<div className="w-full bg-[--bg-main] rounded-full h-2">
						<div
							className="bg-[--text-secondary] h-2 rounded-full"
							style={{ width: "12%" }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
