/** @module Selection box visual overlay rendered during box-selection drag operations */
"use client";

import type { SelectionBoxBounds } from "@/selection/types";

interface SelectionBoxProps {
	/** Bounds of the selection box, or null when inactive. */
	bounds: SelectionBoxBounds | null;
}

/** React component rendering SelectionBox. */
export function SelectionBox({ bounds }: SelectionBoxProps) {
	if (!bounds) return null;

	return (
		<div
			style={{
				left: `${bounds.left}px`,
				top: `${bounds.top}px`,
				width: `${bounds.width}px`,
				height: `${bounds.height}px`,
			}}
			className="border-foreground/50 bg-foreground/5 pointer-events-none absolute z-50 border"
		/>
	);
}
