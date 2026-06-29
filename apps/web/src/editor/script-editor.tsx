import React, { useState } from "react";
import { useWasm } from "@/hooks/use-wasm";

export function ScriptEditor() {
	const { time } = useWasm();
	const [selectedText, setSelectedText] = useState("");

	// TODO: Wire to project transcript data (backend: pre-processing /transcribe, ai-agents orchestrator)
	const mockScript = [
		{ id: "sentence_1", text: "INT. SPACESHIP - DAY" },
		{
			id: "sentence_2",
			text: "CAPTAIN: We are venting oxygen! We need to seal the airlock.",
		},
		{
			id: "sentence_3",
			text: "PILOT: I'm trying, but the manual override is jammed!",
		},
	];

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
				{mockScript.map((line) => (
					<p
						key={line.id}
						className="cursor-pointer hover:bg-yellow-200 transition-colors p-1 rounded"
						onMouseUp={() => handleTextSelection(line.id)}
					>
						{line.text}
					</p>
				))}
			</div>

			<div className="mt-6 text-sm text-muted italic">
				Highlight text to instantly cut the video timeline.
			</div>
		</div>
	);
}
