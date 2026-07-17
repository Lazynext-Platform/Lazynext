/** @module Graphics type definitions for graphic element rendering and registration */
import type { ParamDefinition, ParamValues } from "@/params";

/** Utility representing DEFAULT_GRAPHIC_SOURCE_SIZE. */
export const DEFAULT_GRAPHIC_SOURCE_SIZE = 512;

/** Type definition for GraphicRenderContext. */
export interface GraphicRenderContext {
	/** Canvas 2D context to draw the graphic into. */
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	/** Current parameter values for the graphic. */
	params: ParamValues;
	/** Render target width in pixels. */
	width: number;
	/** Render target height in pixels. */
	height: number;
}

/** Type definition for GraphicDefinition. */
export interface GraphicDefinition {
	/** Unique identifier for the graphic definition. */
	id: string;
	/** Human-readable graphic name. */
	name: string;
	/** Search keywords for discovering the graphic. */
	keywords: string[];
	/** Parameter definitions exposed by the graphic. */
	params: ParamDefinition[];
	/** Draws the graphic into the provided render context. */
	render(context: GraphicRenderContext): void;
}

/** Type definition for GraphicInstance. */
export interface GraphicInstance {
	/** Identifier of the graphic definition to render. */
	definitionId: string;
	/** Current parameter values for the instance. */
	params: ParamValues;
}
