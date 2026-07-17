/**
 * Transcript editor for text-based video editing.
 *
 * Displays a Whisper-generated transcript with timestamps. Clicking a
 * line seeks the timeline to that moment. Deleting a line triggers a
 * razor cut on the corresponding video segment via WASM.
 *
 * @module editor/TranscriptEditor
 */

import { useState } from "react";
import { useWasm } from "@/hooks/use-wasm";

/**
 * Interactive transcript editor linked to the NLE timeline.
 *
 * Click a transcript line to seek, delete a line to razor-cut the
 * underlying video segment on the timeline.
 */
export function TranscriptEditor() {
	const { time } = useWasm();

	// Transcription data comes from the pre-processing service (Whisper on port 8000).
	// Once a transcript is generated, it populates this state via the editor context.
	const [script, setScript] = useState<Array<{
		id: string; text: string; startMs: number; endMs: number; deleted: boolean;
	}>>([]);

	const handleTextSelection = (startMs: number, _endMs: number) => {
		// Just highlight/seek
		time.setFrame((startMs / 1000.0) * 30);
	};

    const handleDelete = (id: string, startMs: number, endMs: number) => {
        // Map text deletion to timeline razor/trim
        time.delete_cut_from_script(startMs, endMs);
        setScript(prev => prev.map(s => s.id === id ? { ...s, deleted: true } : s));
    };

	return (
		<div className="p-6 bg-background border border-gray-300 rounded shadow-lg max-w-2xl font-sans text-foreground">
			<h2 className="font-bold text-xl mb-4 border-b pb-2">
				Transcript Editor
			</h2>

			<div className="flex flex-col gap-4">
				{script.length === 0 ? (
					<p className="text-gray-400 text-sm">
						No transcript loaded. Use the Lazynext AI Agent to generate a transcript from your video.
					</p>
				) : (
					script.map((line) => (
					<div
						key={line.id}
						className={`flex items-start justify-between p-2 rounded transition-colors ${line.deleted ? 'opacity-30 line-through bg-gray-100' : 'hover:bg-blue-50'}`}
					>
                        <div
                            className="cursor-pointer flex-1"
                            onClick={() => !line.deleted && handleTextSelection(line.startMs, line.endMs)}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                            role="button"
                            tabIndex={0}
                        >
                            <span className="text-xs text-gray-500 mr-3 inline-block w-12">
                                {(line.startMs / 1000).toFixed(1)}s
                            </span>
						    {line.text}
                        </div>
                        {!line.deleted && (
                            <button 
                                onClick={() => handleDelete(line.id, line.startMs, line.endMs)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100 px-2 py-1 rounded text-sm ml-4"
                            >
                                Delete Clip
                            </button>
                        )}
					</div>
					))
				)
			}</div>

			<div className="mt-6 text-sm text-gray-500 italic">
				Click text to seek timeline. Delete text to razor and disable the corresponding video clip.
			</div>
		</div>
	);
}
