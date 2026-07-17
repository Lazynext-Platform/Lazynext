/** @module Shared graphic parameter definitions (stroke align) used across graphic element types */

import type { ParamDefinition } from "@/params";

/** Type definition for GraphicStrokeAlign. */
export type GraphicStrokeAlign = "inside" | "center" | "outside";

/** Utility representing STROKE_ALIGN_PARAM. */
export const STROKE_ALIGN_PARAM: ParamDefinition<"strokeAlign"> = {
	key: "strokeAlign",
	label: "Stroke align",
	type: "select",
	default: "center",
	group: "stroke",
	options: [
		{ value: "inside", label: "Inside" },
		{ value: "center", label: "Center" },
		{ value: "outside", label: "Outside" },
	],
};
