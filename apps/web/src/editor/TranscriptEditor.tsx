import React, { useState } from "react";
import { useWasm } from "@/hooks/use-wasm";

export function TranscriptEditor() {
	const { time } = useWasm();

	const [mockScript, setMockScript] = useState([
		{ id: "sentence_1", text: "INT. SPACESHIP - DAY", startMs: 0, endMs: 2000, deleted: false },
		{
			id: "sentence_2",
			text: "CAPTAIN: We are venting oxygen! We need to seal the airlock.",
            startMs: 2000,
            endMs: 6500,
            deleted: false
		},
		{
			id: "sentence_3",
			text: "PILOT: I'm trying, but the manual override is jammed!",
            startMs: 6500,
            endMs: 9000,
            deleted: false
		},
        {
			id: "sentence_4",
			text: "(uh) Wait, I got it!",
            startMs: 9000,
            endMs: 11000,
            deleted: false
		},
	]);

	const handleTextSelection = (startMs: number, endMs: number) => {
		// Just highlight/seek
		time.setFrame((startMs / 1000.0) * 30);
	};

    const handleDelete = (id: string, startMs: number, endMs: number) => {
        // Map text deletion to timeline razor/trim
        time.delete_cut_from_script(startMs, endMs);
        setMockScript(prev => prev.map(s => s.id === id ? { ...s, deleted: true } : s));
    };

	return (
		<div className="p-6 bg-white border border-gray-300 rounded shadow-lg max-w-2xl font-sans text-black">
			<h2 className="font-bold text-xl mb-4 border-b pb-2">
				Transcript Editor
			</h2>

			<div className="flex flex-col gap-4">
				{mockScript.map((line) => (
					<div
						key={line.id}
						className={`flex items-start justify-between p-2 rounded transition-colors ${line.deleted ? 'opacity-30 line-through bg-gray-100' : 'hover:bg-blue-50'}`}
					>
                        <p 
                            className="cursor-pointer flex-1"
                            onClick={() => !line.deleted && handleTextSelection(line.startMs, line.endMs)}
                        >
                            <span className="text-xs text-gray-500 mr-3 inline-block w-12">
                                {(line.startMs / 1000).toFixed(1)}s
                            </span>
						    {line.text}
                        </p>
                        {!line.deleted && (
                            <button 
                                onClick={() => handleDelete(line.id, line.startMs, line.endMs)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100 px-2 py-1 rounded text-sm ml-4"
                            >
                                Delete Clip
                            </button>
                        )}
					</div>
				))}
			</div>

			<div className="mt-6 text-sm text-gray-500 italic">
				Click text to seek timeline. Delete text to razor and disable the corresponding video clip.
			</div>
		</div>
	);
}
