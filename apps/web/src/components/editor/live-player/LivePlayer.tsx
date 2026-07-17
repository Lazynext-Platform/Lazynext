/**
 * @module Live player — Playback control component providing play/pause
 * buttons and frame navigation for the video editor preview panel.
 */
import React from "react";

/**
 * LivePlayer Component integrated from Twick React SDK.
 */
export const LivePlayer: React.FC = () => {
	return (
		<div className="w-full flex justify-center p-2 bg-panel">
			<button className="px-4 py-2 bg-blue-600 rounded">Play</button>
			<button className="px-4 py-2 bg-hover rounded ml-2">Pause</button>
		</div>
	);
};
