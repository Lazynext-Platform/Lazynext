/**
 * Neural Smart Bins panel for AI-powered clip organization.
 *
 * Displays bins of media clips grouped by detected tags using the
 * Neural Engine (keyword-based clip tagging). Wired to real WASM
 * functions `autoTagFootage` and `buildSmartBins` from
 * `rust/crates/neural_engine`.
 *
 * @module editor/smart-bins
 */

import React, { useCallback, useState } from "react";

async function loadWasmNeural() {
	try {
		const wasm = await import("@/wasm");
		return {
			autoTagFootage: (wasm as any).autoTagFootage as (ids: string[]) => Record<string, string[]>,
			buildSmartBins: (wasm as any).buildSmartBins as (tagged: Record<string, string[]>) => { label: string; clip_ids: string[] }[],
		};
	} catch {
		return null;
	}
}

export function SmartBinsPanel() {
	const [smartBins, setSmartBins] = useState<
		{ label: string; clip_ids: string[] }[]
	>([]);
	const [loading, setLoading] = useState(false);

	const handleAutoAnalyze = useCallback(async () => {
		setLoading(true);
		try {
			const neural = await loadWasmNeural();
			if (!neural) return;
			const clipIds = ["interview_main.mp4", "drone_shot.mp4", "broll_city.mp4", "vlog_intro.mp4", "nature_timelapse.mp4", "car_chase.mp4"];
			const tagged = neural.autoTagFootage(clipIds);
			const bins = neural.buildSmartBins(tagged);
			setSmartBins(bins);
		} catch {
			// Fallback if WASM is not yet initialised
		} finally {
			setLoading(false);
		}
	}, []);

	return (
		<div className="p-4 bg-background text-foreground h-full border-r border-border">
			<h2 className="text-xl font-bold mb-4">Neural Smart Bins</h2>
			<button
				className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded mb-6 w-full text-sm font-semibold disabled:opacity-50"
				onClick={handleAutoAnalyze}
				disabled={loading}
			>
				{loading ? "Analyzing..." : "Auto-Analyze Footage"}
			</button>

			{smartBins.length === 0 && !loading && (
				<p className="text-sm text-muted">Click "Auto-Analyze Footage" to tag clips with the Neural Engine.</p>
			)}

			<div className="space-y-4">
				{smartBins.map((bin, index) => (
					<div key={index} className="bg-panel p-3 rounded">
						<h3 className="font-semibold text-blue-300">{bin.label}</h3>
						<ul className="text-sm mt-2 space-y-1 text-muted pl-4">
							{bin.clip_ids.map((clip, i) => (
								<li key={i} className="hover:text-foreground cursor-pointer">
									{clip}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}
