/**
 * Remote cursor overlay for multiplayer collaboration.
 *
 * Renders other users' cursors on the editor canvas with their
 * names, colors, and optional selection highlights.
 *
 * @module collaboration/cursors
 */

import React from "react";

export interface RemoteCursor {
	peerId: string;
	userName: string;
	color: string;
	x: number;
	y: number;
	selection?: string[];
}

interface CursorsOverlayProps {
	cursors: RemoteCursor[];
}

/**
 * Renders remote user cursors as SVG pointers with colored name labels.
 *
 * @param cursors - array of remote cursor positions with peer metadata.
 */
export function CursorsOverlay({ cursors }: CursorsOverlayProps) {
	if (cursors.length === 0) return null;

	return (
		<div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
			{cursors.map((cursor) => (
				<div
					key={cursor.peerId}
					className="absolute transition-all duration-75 ease-linear"
					style={{ left: cursor.x, top: cursor.y }}
				>
					<svg
						width="18"
						height="22"
						viewBox="0 0 18 22"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" }}
					>
						<path
							d="M1 1L7 19L11 13L17 22L15 1H1Z"
							fill={cursor.color}
							stroke="white"
							strokeWidth="1"
						/>
					</svg>
					<span
						className="absolute left-3 top-3 text-xs font-semibold text-foreground px-1.5 py-0.5 rounded whitespace-nowrap"
						style={{ backgroundColor: cursor.color }}
					>
						{cursor.userName}
					</span>
				</div>
			))}
		</div>
	);
}
