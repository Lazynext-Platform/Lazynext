/** @module Guide type definitions for canvas alignment guides and overlays */
import type { ReactNode } from "react";

export interface GridConfig {
	rows: number;
	cols: number;
}

export interface GuideRenderProps {
	width: number;
	height: number;
}

export interface GuideDefinition {
	id: string;
	label: string;
	renderPreview: () => ReactNode;
	renderTriggerIcon: () => ReactNode;
	renderOverlay: (props: GuideRenderProps) => ReactNode;
	renderOptions?: () => ReactNode;
}
