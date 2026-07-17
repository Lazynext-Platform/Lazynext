/** @module Guide type definitions for canvas alignment guides and overlays */
import type { ReactNode } from "react";

/** Type definition for GridConfig. */
export interface GridConfig {
	/** Number of grid rows. */
	rows: number;
	/** Number of grid columns. */
	cols: number;
}

/** Type definition for GuideRenderProps. */
export interface GuideRenderProps {
	/** Canvas width in pixels. */
	width: number;
	/** Canvas height in pixels. */
	height: number;
}

/** Type definition for GuideDefinition. */
export interface GuideDefinition {
	/** Unique guide identifier. */
	id: string;
	/** Human-readable label. */
	label: string;
	/** Renders the guide preview thumbnail. */
	renderPreview: () => ReactNode;
	/** Renders the trigger icon in the toolbar. */
	renderTriggerIcon: () => ReactNode;
	/** Renders the guide overlay on the canvas. */
	renderOverlay: (props: GuideRenderProps) => ReactNode;
	/** Optional options panel renderer. */
	renderOptions?: () => ReactNode;
}
