/** @module Preview overlay types and rendering logic for HUD elements on the canvas */
import type { ReactNode } from "react";

/** Type definition for PreviewOverlayHudAnchor. */
export type PreviewOverlayHudAnchor =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right";

/** Type definition for PreviewOverlayMount. */
export type PreviewOverlayMount =
	| {
			kind: "hud";
			anchor: PreviewOverlayHudAnchor;
			order?: number;
	  }
	| {
			kind: "scene";
			x?: number;
			y?: number;
			width?: number;
			height?: number;
	  }
	| {
			kind: "viewport";
			x?: number;
			y?: number;
			width?: number;
			height?: number;
	  };

/** Type definition for PreviewOverlayPlane. */
export type PreviewOverlayPlane = "under-interaction" | "over-interaction";

/** Type definition for PreviewOverlayRenderContext. */
export interface PreviewOverlayRenderContext {
	/** Scene height in pixels. */
	sceneHeight: number;
	/** Scene width in pixels. */
	sceneWidth: number;
}

/** Type definition for PreviewOverlayInstance. */
export interface PreviewOverlayInstance {
	/** Unique instance identifier. */
	id: string;
	/** Mount position definition. */
	mount: PreviewOverlayMount;
	/** Rendering plane priority. */
	plane?: PreviewOverlayPlane;
	/** Pointer event mode. */
	pointerEvents?: "none" | "auto";
	/** Z-index for layering. */
	zIndex?: number;
	/** Render function returning React nodes. */
	render: (context: PreviewOverlayRenderContext) => ReactNode;
}

/** Type definition for PreviewOverlayDefinition. */
export interface PreviewOverlayDefinition {
	/** Unique definition identifier. */
	id: string;
	/** Human-readable overlay label. */
	label: string;
	/** Whether visible by default. */
	defaultVisible?: boolean;
}

/** Type definition for PreviewOverlayControl. */
export interface PreviewOverlayControl extends PreviewOverlayDefinition {
	/** Current visibility state. */
	isVisible: boolean;
}

/** Type definition for PreviewOverlaySourceResult. */
export interface PreviewOverlaySourceResult {
	/** Overlay definitions contributed by this source. */
	definitions: PreviewOverlayDefinition[];
	/** Overlay instances contributed by this source. */
	instances: PreviewOverlayInstance[];
}

/** Utility representing EMPTY_PREVIEW_OVERLAY_SOURCE_RESULT. */
export const EMPTY_PREVIEW_OVERLAY_SOURCE_RESULT: PreviewOverlaySourceResult = {
	definitions: [],
	instances: [],
};

/** Utility representing isPreviewOverlayVisible. */
export function isPreviewOverlayVisible({
	overlay,
	overlays,
}: {
	overlay: PreviewOverlayDefinition;
	overlays: Record<string, boolean>;
}): boolean {
	return overlays[overlay.id] ?? overlay.defaultVisible ?? true;
}

/** Utility representing createPreviewOverlayControl. */
export function createPreviewOverlayControl({
	overlay,
	overlays,
}: {
	overlay: PreviewOverlayDefinition;
	overlays: Record<string, boolean>;
}): PreviewOverlayControl {
	return {
		...overlay,
		isVisible: isPreviewOverlayVisible({ overlay, overlays }),
	};
}

/** Utility representing mergePreviewOverlaySources. */
export function mergePreviewOverlaySources({
	sources,
}: {
	sources: PreviewOverlaySourceResult[];
}): PreviewOverlaySourceResult {
	const definitionsById = new Map<string, PreviewOverlayDefinition>();
	const instances: PreviewOverlayInstance[] = [];

	for (const source of sources) {
		for (const definition of source.definitions) {
			definitionsById.set(definition.id, definition);
		}
		instances.push(...source.instances);
	}

	return {
		definitions: [...definitionsById.values()],
		instances,
	};
}
