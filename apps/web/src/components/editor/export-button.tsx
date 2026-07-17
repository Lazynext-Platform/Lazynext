/**
 * Export button — triggers the export pipeline for a given project.
 *
 * @module components/editor/export-button
 */

"use client";

import { useState } from "react";

/** React component rendering ExportButton. */
export default function ExportButton({ projectId }: { projectId: string }) {
	const [isExporting, setIsExporting] = useState(false);
	const [status, setStatus] = useState("");

	const handleExport = async () => {
		setIsExporting(true);
		setStatus("Exporting...");

		try {
			const res = await fetch("/api/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ projectId }),
			});

			const data = await res.json();

			if (!res.ok) {
				setStatus(`Error: ${data.error || "Failed to export"}`);
			} else {
				setStatus(`Success: ${data.message}`);
			}
		} catch (err) {
			console.error(err);
			setStatus("Error: Network failure");
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="flex items-center gap-2">
			{status && <span className="text-xs text-muted">{status}</span>}
			<button
				onClick={handleExport}
				disabled={isExporting}
				className="rounded-md bg-glass px-3 py-1 text-sm text-foreground hover:bg-hover disabled:opacity-50"
			>
				{isExporting ? "Exporting..." : "Export"}
			</button>
		</div>
	);
}
