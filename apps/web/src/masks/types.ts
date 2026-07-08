/** @module Core mask type definitions — shapes, parameters, overlays, and builtin mask type discriminants for the NLE compositor mask system. */
import type { ElementBounds } from "@/preview/element-bounds";
import type { SnapLine } from "@/preview/preview-snap";
import type { ParamDefinition } from "@/params";
import type { FreeformPathPoint } from "@/masks/freeform/path";
import type {
	TextDecoration,
	TextFontStyle,
	TextFontWeight,
} from "@/text/primitives";

export type BuiltinMaskType =
	| "split"
	| "cinematic-bars"
	| "rectangle"
	| "ellipse"
	| "heart"
	| "diamond"
	| "star"
	| "text";

export type MaskType = BuiltinMaskType | "freeform";

export interface BaseMaskParams {
	/** Feather radius in pixels. */
	feather: number;
	/** Whether the mask is inverted. */
	inverted: boolean;
	/** Color of the mask stroke. */
	strokeColor: string;
	/** Width of the mask stroke in pixels. */
	strokeWidth: number;
	/** Alignment of the stroke relative to the mask path. */
	strokeAlign: "inside" | "center" | "outside";
}

export interface SplitMaskParams extends BaseMaskParams {
	/** Horizontal center of the mask (0-1 normalized). */
	centerX: number;
	/** Vertical center of the mask (0-1 normalized). */
	centerY: number;
	/** Rotation angle in degrees. */
	rotation: number;
}

export interface RectangleMaskParams extends BaseMaskParams {
	/** Horizontal center of the mask (0-1 normalized). */
	centerX: number;
	/** Vertical center of the mask (0-1 normalized). */
	centerY: number;
	/** Width of the mask (0-1 normalized). */
	width: number;
	/** Height of the mask (0-1 normalized). */
	height: number;
	/** Rotation angle in degrees. */
	rotation: number;
	/** Uniform scale factor. */
	scale: number;
}

export interface TextMaskParams extends BaseMaskParams {
	/** Text content to render. */
	content: string;
	/** Font size in pixels. */
	fontSize: number;
	/** Font family name. */
	fontFamily: string;
	/** Font weight. */
	fontWeight: TextFontWeight;
	/** Font style (normal, italic, etc.). */
	fontStyle: TextFontStyle;
	/** Text decoration (underline, etc.). */
	textDecoration: TextDecoration;
	/** Letter spacing in pixels. */
	letterSpacing: number;
	/** Line height multiplier. */
	lineHeight: number;
	/** Horizontal center of the mask (0-1 normalized). */
	centerX: number;
	/** Vertical center of the mask (0-1 normalized). */
	centerY: number;
	/** Rotation angle in degrees. */
	rotation: number;
	/** Uniform scale factor. */
	scale: number;
}

export interface FreeformPathMaskParams extends BaseMaskParams {
	/** Array of bezier path points. */
	path: FreeformPathPoint[];
	/** Whether the path is closed. */
	closed: boolean;
	/** Horizontal center of the mask (0-1 normalized). */
	centerX: number;
	/** Vertical center of the mask (0-1 normalized). */
	centerY: number;
	/** Rotation angle in degrees. */
	rotation: number;
	/** Uniform scale factor. */
	scale: number;
}

export interface SplitMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the split mask type. */
	type: "split";
	/** Mask parameters. */
	params: SplitMaskParams;
}

export interface CinematicBarsMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the cinematic-bars mask type. */
	type: "cinematic-bars";
	/** Mask parameters. */
	params: RectangleMaskParams;
}

export interface RectangleMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the rectangle mask type. */
	type: "rectangle";
	/** Mask parameters. */
	params: RectangleMaskParams;
}

export interface EllipseMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the ellipse mask type. */
	type: "ellipse";
	/** Mask parameters. */
	params: RectangleMaskParams;
}

export interface HeartMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the heart mask type. */
	type: "heart";
	/** Mask parameters. */
	params: RectangleMaskParams;
}

export interface DiamondMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the diamond mask type. */
	type: "diamond";
	/** Mask parameters. */
	params: RectangleMaskParams;
}

export interface StarMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the star mask type. */
	type: "star";
	/** Mask parameters. */
	params: RectangleMaskParams;
}

export interface TextMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the text mask type. */
	type: "text";
	/** Mask parameters. */
	params: TextMaskParams;
}

export type BuiltinShapeMask =
	| SplitMask
	| CinematicBarsMask
	| RectangleMask
	| EllipseMask
	| HeartMask
	| DiamondMask
	| StarMask
	| TextMask;

export interface FreeformPathMask {
	/** Unique identifier for this mask instance. */
	id: string;
	/** Discriminant for the freeform mask type. */
	type: "freeform";
	/** Mask parameters. */
	params: FreeformPathMaskParams;
}

export type Mask = BuiltinShapeMask | FreeformPathMask;

export type MaskByType<TType extends MaskType> = Extract<Mask, { type: TType }>;
export type MaskParamsByType<TType extends MaskType> =
	MaskByType<TType>["params"];

type MaskPathArgs<TParams extends BaseMaskParams> = {
	/** Resolved params with defaults applied. */
	resolvedParams: TParams;
	/** Canvas width in pixels. */
	width: number;
	/** Canvas height in pixels. */
	height: number;
};

type MaskDrawArgs<TParams extends BaseMaskParams> = MaskPathArgs<TParams> & {
	/** Canvas 2D rendering context. */
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
};

export type MaskBody<TParams extends BaseMaskParams = BaseMaskParams> =
	| {
			kind: "fillPath";
			buildPath(args: MaskPathArgs<TParams>): Path2D;
	  }
	| {
			kind: "drawOpaque";
			drawOpaque(args: MaskDrawArgs<TParams>): void;
	  }
	| {
			kind: "drawWithFeather";
			drawWithFeather(args: MaskDrawArgs<TParams> & { feather: number }): void;
			opaqueFastPath?: {
				buildPath(args: MaskPathArgs<TParams>): Path2D;
			};
	  };

export type MaskStroke<TParams extends BaseMaskParams = BaseMaskParams> =
	| {
			kind: "strokeFromPath";
			buildStrokePath(args: MaskPathArgs<TParams>): Path2D;
	  }
	| {
			kind: "renderStroke";
			renderStroke(args: MaskDrawArgs<TParams>): void;
	  };

export interface MaskRenderer<TParams extends BaseMaskParams = BaseMaskParams> {
	/** Body rendering strategy (fill path, draw opaque, or draw with feather). */
	body: MaskBody<TParams>;
	/** Optional stroke rendering strategy. */
	stroke?: MaskStroke<TParams>;
}

export interface MaskFeatures {
	/** Whether the mask supports position transforms. */
	hasPosition: boolean;
	/** Whether the mask supports rotation transforms. */
	hasRotation: boolean;
	/** The mask sizing mode. */
	sizeMode: "none" | "uniform" | "width-height" | "height-only" | "width-only";
}

export type MaskHandleIcon = "rotate" | "feather";

export type MaskHandleKind = "corner" | "edge" | "icon" | "point";

type Side = "left" | "right" | "top" | "bottom";
type CornerXY = { x: "left" | "right"; y: "top" | "bottom" };

export type MaskHandleId =
	| { kind: "position" }
	| { kind: "rotation" }
	| { kind: "feather" }
	| { kind: "scale" }
	| { kind: "edge"; side: Side }
	| { kind: "corner"; corner: CornerXY }
	| { kind: "anchor"; pointId: string }
	| { kind: "segment"; index: number };

export function maskHandleIdKey({ id }: { id: MaskHandleId }): string {
	switch (id.kind) {
		case "position":
		case "rotation":
		case "feather":
		case "scale":
			return id.kind;
		case "edge":
			return id.side;
		case "corner":
			return `${id.corner.y}-${id.corner.x}`;
		case "anchor":
			return `point:${id.pointId}:anchor`;
		case "segment":
			return `segment:${id.index}`;
	}
}

export interface MaskHandlePosition {
	/** Unique handle identifier. */
	id: MaskHandleId;
	/** Canvas X position. */
	x: number;
	/** Canvas Y position. */
	y: number;
	/** CSS cursor for the handle. */
	cursor: string;
	/** Kind of handle. */
	kind: MaskHandleKind;
	/** Whether this handle is currently selected. */
	isSelected?: boolean;
	/** Axis constraint for edge handles. */
	edgeAxis?: "horizontal" | "vertical";
	/** Rotation angle in degrees. */
	rotation?: number;
	/** Icon to display on the handle. */
	icon?: MaskHandleIcon;
}

export interface MaskLineOverlay {
	/** Unique overlay identifier. */
	id: string;
	/** Discriminator identifying a line mask overlay. */
	type: "line";
	/** Start point in canvas coordinates. */
	start: { x: number; y: number };
	/** End point in canvas coordinates. */
	end: { x: number; y: number };
	/** CSS cursor for the overlay. */
	cursor?: string;
	/** Associated handle identifier. */
	handleId?: MaskHandleId;
}

export interface MaskRectOverlay {
	/** Unique overlay identifier. */
	id: string;
	/** Discriminator identifying a rectangle mask overlay. */
	type: "rect";
	/** Center point in canvas coordinates. */
	center: { x: number; y: number };
	/** Width in canvas pixels. */
	width: number;
	/** Height in canvas pixels. */
	height: number;
	/** Rotation angle in degrees. */
	rotation: number;
	/** Whether to render with dashed lines. */
	dashed?: boolean;
	/** CSS cursor for the overlay. */
	cursor?: string;
	/** Associated handle identifier. */
	handleId?: MaskHandleId;
}

export interface MaskShapeOverlay {
	/** Unique overlay identifier. */
	id: string;
	/** Discriminator identifying a polygon/shape mask overlay. */
	type: "shape";
	/** Center point in canvas coordinates. */
	center: { x: number; y: number };
	/** Width in canvas pixels. */
	width: number;
	/** Height in canvas pixels. */
	height: number;
	/** Rotation angle in degrees. */
	rotation: number;
	/** SVG path data string. */
	pathData: string;
	/** CSS cursor for the overlay. */
	cursor?: string;
	/** Associated handle identifier. */
	handleId?: MaskHandleId;
}

export interface MaskCanvasPathOverlay {
	/** Unique overlay identifier. */
	id: string;
	/** Discriminator identifying a freeform canvas-path mask overlay. */
	type: "canvas-path";
	/** Canvas path data string. */
	pathData: string;
	/** Coordinate space for the path data. */
	coordinateSpace?: "canvas" | "overlay";
	/** CSS cursor for the overlay. */
	cursor?: string;
	/** Associated handle identifier. */
	handleId?: MaskHandleId;
	/** Stroke width for the path. */
	strokeWidth?: number;
	/** Stroke opacity for the path. */
	strokeOpacity?: number;
}

export type MaskOverlay =
	| MaskLineOverlay
	| MaskRectOverlay
	| MaskShapeOverlay
	| MaskCanvasPathOverlay;

export interface MaskDefaultContext {
	/** Optional element canvas size for default layout. */
	elementSize?: { width: number; height: number };
}

export interface MaskParamUpdateArgs<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	/** The handle being dragged. */
	handleId: MaskHandleId;
	/** Params at the start of the interaction. */
	startParams: TParams;
	/** Horizontal delta since drag start. */
	deltaX: number;
	/** Vertical delta since drag start. */
	deltaY: number;
	/** Canvas X at drag start. */
	startCanvasX: number;
	/** Canvas Y at drag start. */
	startCanvasY: number;
	/** Element bounds for coordinate mapping. */
	bounds: ElementBounds;
	/** Canvas size for coordinate mapping. */
	canvasSize: { width: number; height: number };
}

export interface MaskSnapArgs<TParams extends BaseMaskParams = BaseMaskParams> {
	/** The handle being snapped. */
	handleId: MaskHandleId;
	/** Params at the start of the interaction. */
	startParams: TParams;
	/** Proposed params before snapping. */
	proposedParams: TParams;
	/** Element bounds for coordinate mapping. */
	bounds: ElementBounds;
	/** Canvas size for coordinate mapping. */
	canvasSize: { width: number; height: number };
	/** Snap threshold in canvas pixels. */
	snapThreshold: { x: number; y: number };
}

export interface MaskSnapResult<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	/** Snapped params. */
	params: TParams;
	/** Snap lines to render for visual feedback. */
	activeLines: SnapLine[];
}

export interface MaskInteractionResult {
	/** Interactive drag handles. */
	handles: MaskHandlePosition[];
	/** Visual overlays. */
	overlays: MaskOverlay[];
}

export interface MaskInteractionDefinition<
	TParams extends BaseMaskParams = BaseMaskParams,
> {
	/** Computes handles and overlays for the current mask state. */
	getInteraction(args: {
		/** Current mask parameters. */
		params: TParams;
		/** Element bounds for coordinate mapping. */
		bounds: ElementBounds;
		/** Canvas display scale factor. */
		displayScale: number;
		/** Horizontal scale factor. */
		scaleX: number;
		/** Vertical scale factor. */
		scaleY: number;
	}): MaskInteractionResult;
	/** Optional snap behavior during drag. */
	snap?(args: MaskSnapArgs<TParams>): MaskSnapResult<TParams>;
}

export interface MaskDefinition<TType extends MaskType = MaskType> {
	/** The mask type discriminant. */
	type: TType;
	/** Human-readable mask name. */
	name: string;
	/** Feature flags for this mask type. */
	features: MaskFeatures;
	/** Parameter definitions for the inspector panel. */
	params: ParamDefinition<keyof MaskParamsByType<TType> & string>[];
	/** Renderer defining how the mask body and stroke are drawn. */
	renderer: MaskRenderer<MaskParamsByType<TType>>;
	/** Interaction definition for drag handles and overlays. */
	interaction: MaskInteractionDefinition<MaskParamsByType<TType>>;
	/** When defined and returning false, the mask is not applied and the element renders fully visible. */
	isActive?(params: MaskParamsByType<TType>): boolean;
	/** Builds the default mask shape for the given context. */
	buildDefault(context: MaskDefaultContext): Omit<MaskByType<TType>, "id">;
	/** Computes the param delta for a handle drag. */
	computeParamUpdate(
		/** Handle-drag arguments (handle id, delta, current params). */
		args: MaskParamUpdateArgs<MaskParamsByType<TType>>,
	): Partial<MaskParamsByType<TType>>;
}
