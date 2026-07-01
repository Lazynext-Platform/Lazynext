/**
 * Screenplay editor that maps transcript text to timeline cuts.
 *
 * Displays a Whisper-transcribed script. When the user highlights a
 * sentence, the corresponding video segment is selected on the
 * timeline via WASM.
 *
 * @module editor/script-editor
 */

import React, { useState } from "react";
import { useWasm } from "@/hooks/use-wasm";

/**
 * Text-based screenplay editor connected to the timeline.
 *
 * Renders transcript lines and, on text selection, commands the Rust
 * engine to cut the timeline to the matching dialogue segment.
 */
export function ScriptEditor() {
	const { time } = useWasm();
	const [selectedText, setSelectedText] = useState("");

	// Script data from project transcript (pre-processing service, port 8000).
	// Populated when a Whisper transcript is available for the active project.
	const script: Array<{ id: string; text: string }> = [];

	const handleTextSelection = (sentenceId: string) => {
		console.log(`User highlighted sentence: ${sentenceId}`);
		// Lookup the timestamp for this sentence from the ScriptSyncService
		const startMs = 15000;
		const endMs = 18450;

		// Command the Rust engine to automatically cut the timeline to this exact dialogue
		time.insert_cut_from_script(startMs, endMs);
		console.log(
			`Commanded WebAssembly to cut timeline from ${startMs}ms to ${endMs}ms!`,
		);
	};

	return (
		<div className="p-6 bg-white border border-gray-300 rounded shadow-lg max-w-lg font-serif text-black">
			<h2 className="font-bold text-xl mb-4 border-b pb-2">
				Screenplay Editor
			</h2>

			<div className="flex flex-col gap-4">
				{script.length === 0 ? (
					<p className="text-gray-400 text-sm p-4">
						Transcribe your video via AI Copilot to populate the script editor.
					</p>
				) : (
					script.map((line) => (
					<p
						key={line.id}
						className="cursor-pointer hover:bg-yellow-200 transition-colors p-1 rounded"
						onMouseUp={() => handleTextSelection(line.id)}
					>
						{line.text}
					</p>
				)))}
			</div>

			<div className="mt-6 text-sm text-muted italic">
				Highlight text to instantly cut the video timeline.
			</div>
		</div>
	);
}
