/**
 * AI Actor Studio panel for generating avatar videos from text scripts.
 *
 * Sends a script to the generative studio service (Python FastAPI on port 8001)
 * which produces an AI avatar speaking the provided text. The resulting media
 * is intended to be inserted onto the timeline.
 *
 * @module editor/avatar-prompt
 */

import React, { useState } from "react";

const GEN_STUDIO_URL = process.env.NEXT_PUBLIC_GENERATIVE_STUDIO_URL || "http://127.0.0.1:8001";

/**
 * Text-to-avatar generation panel.
 *
 * Accepts a text script, sends it to the AI avatar studio, and displays
 * generation status. On success the avatar media can be inserted onto
 * the timeline.
 */
export function AvatarPrompt() {
	const [script, setScript] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [status, setStatus] = useState<string | null>(null);

	const handleGenerate = async () => {
		if (!script.trim()) return;

		setIsGenerating(true);
		setStatus("Contacting AI avatar studio...");

		try {
			const res = await fetch(`${GEN_STUDIO_URL}/generate-avatar`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					avatar_id: `avatar_${Date.now()}`,
					script: script.trim(),
					voice_id: "21m00Tcm4TlvDq8ikWAM",
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
				throw new Error(err.detail || `Avatar generation failed (${res.status})`);
			}

			const data = await res.json();
			setStatus(`Avatar generated via ${data.source || "AI studio"}!`);
			setScript("");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Unknown error";
			setStatus(`Failed: ${msg}`);
			console.error("Avatar generation error:", msg);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div className="p-4 bg-background border border-purple-500 rounded flex flex-col gap-3 w-80 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
			<h3 className="text-foreground font-bold text-sm">🤖 AI Actor Studio</h3>

			<textarea
				value={script}
				onChange={(e) => setScript(e.target.value)}
				placeholder="Type the script for your AI avatar to read..."
				className="w-full h-24 bg-panel text-foreground p-2 rounded border border-border focus:border-purple-500 text-sm"
			/>

			{status && (
				<p className={`text-xs px-2 py-1 rounded ${status.startsWith("Failed") ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
					{status}
				</p>
			)}

			<button
				onClick={handleGenerate}
				disabled={isGenerating || script.length === 0}
				className="w-full bg-purple-600 hover:bg-purple-500 text-foreground font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
			>
				{isGenerating ? "Synthesizing..." : "Generate & Insert"}
			</button>
		</div>
	);
}
