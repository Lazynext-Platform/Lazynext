/** @module Graphics type definitions for graphic element rendering and registration */
import type { ParamDefinition, ParamValues } from "@/params";

export const DEFAULT_GRAPHIC_SOURCE_SIZE = 512;

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

export interface GraphicInstance {
	/** Identifier of the graphic definition to render. */
	definitionId: string;
	/** Current parameter values for the instance. */
	params: ParamValues;
}
