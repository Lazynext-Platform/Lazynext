import React from "react";

interface QueueItem {
	id: string;
	user: string;
	status: "rendering" | "queued" | "completed" | "failed";
	progress: number;
}

export function QueueTable({ items }: { items: QueueItem[] }) {
	return (
		<div className="w-full bg-[--bg-card] rounded-xl border border-[--border-primary] overflow-hidden">
			<div className="p-4 border-b border-[--border-primary]">
				<h3 className="font-semibold text-[--text-primary]">
					OpenSora Render Queue
				</h3>
			</div>
			<table className="w-full text-left text-sm">
				<thead className="bg-[--bg-main] text-[--text-secondary]">
					<tr>
						<th className="px-4 py-3 font-medium">Job ID</th>
						<th className="px-4 py-3 font-medium">User</th>
						<th className="px-4 py-3 font-medium">Status</th>
						<th className="px-4 py-3 font-medium">Progress</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[--border-primary]">
					{items.map((item) => (
						<tr
							key={item.id}
							className="hover:bg-[--bg-hover] transition-colors"
						>
							<td className="px-4 py-3 font-mono text-xs text-[--text-primary]">
								{item.id}
							</td>
							<td className="px-4 py-3 text-[--text-secondary]">{item.user}</td>
							<td className="px-4 py-3">
								<span
									className={`px-2 py-1 rounded-full text-xs font-medium ${
										item.status === "rendering"
											? "bg-[--accent-primary]/20 text-[--accent-primary]"
											: item.status === "completed"
												? "bg-green-500/20 text-green-400"
												: item.status === "failed"
													? "bg-red-500/20 text-red-400"
													: "bg-gray-500/20 text-muted"
									}`}
								>
									{item.status}
								</span>
							</td>
							<td className="px-4 py-3">
								<div className="flex items-center gap-2">
									<div className="w-full bg-[--bg-main] rounded-full h-1.5">
										<div
											className="bg-[--accent-primary] h-1.5 rounded-full transition-all"
											style={{ width: `${item.progress}%` }}
										/>
									</div>
									<span className="text-xs text-[--text-secondary] w-8">{`${item.progress}%`}</span>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
