/**
 * Karaoke text component — highlights words in sync with the current
 * playback frame for lyric/subtitle animations.
 *
 * @module components/karaoke-text
 */

import React from "react";
import { useWasm } from "@/hooks/use-wasm";

export type Word = {
	/** The word text. */
	text: string;
	/** Start frame number. */
	startFrame: number;
	/** End frame number. */
	endFrame: number;
};

export type KaraokeTextProps = {
	/** Array of timed words to render. */
	words: Word[];
};

/**
 * A motion graphics component that reads the current frame from WASM
 * and highlights words as the timeline plays, creating a karaoke effect.
 */
export function KaraokeText({ words }: KaraokeTextProps) {
	const { frame } = useWasm();

	return (
		<div className="absolute bottom-10 left-0 w-full text-center pointer-events-none drop-shadow-md">
			<div className="inline-block bg-background bg-opacity-50 px-6 py-4 rounded-xl">
				{words.map((word, idx) => {
					const isPassed = frame >= word.endFrame;
					const isActive = frame >= word.startFrame && frame < word.endFrame;

					let colorClass = "text-foreground";
					if (isActive) {
						colorClass =
							"text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]";
					} else if (isPassed) {
						colorClass = "text-muted";
					}

					return (
						<span
							key={idx}
							className={`inline-block mx-1 font-bold text-3xl font-sans transition-all duration-150 ${colorClass}`}
						>
							{word.text}
						</span>
					);
				})}
			</div>
		</div>
	);
}
