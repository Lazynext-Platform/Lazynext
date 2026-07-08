/** @module Text render node for rendering styled text elements on the compositor */
import { BaseNode } from "./base-node";
import type { TextElement } from "@/timeline";
import type { EffectPass } from "@/effects/types";
import type { Transform } from "@/primitives/transform";
import type { BlendMode } from "@/primitives/blend-mode";
import { drawMeasuredTextLayout } from "@/text/primitives";
import type { MeasuredTextElement } from "@/text/measure-element";

export type TextNodeParams = TextElement & {
	/** Resolved transform for the text node. */
	transform: Transform;
	/** Opacity of the text (0–1). */
	opacity: number;
	/** Optional blend mode for compositing. */
	blendMode?: BlendMode;
	/** Center point of the canvas in pixels. */
	canvasCenter: { x: number; y: number };
	/** Canvas height in pixels. */
	canvasHeight: number;
	/** Optional canvas text baseline. */
	textBaseline?: CanvasTextBaseline;
};

export interface ResolvedTextNodeState {
	/** Resolved transform for rendering. */
	transform: Transform;
	/** Resolved opacity (0–1). */
	opacity: number;
	/** Resolved text fill color. */
	textColor: string;
	/** Resolved background color. */
	backgroundColor: string;
	/** Effect passes to apply, grouped per stage. */
	effectPasses: EffectPass[][];
	/** Measured text layout for drawing. */
	measuredText: MeasuredTextElement;
}

export class TextNode extends BaseNode<TextNodeParams, ResolvedTextNodeState> {}

export function renderTextToContext({
	node,
	ctx,
}: {
	node: TextNode;
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
}): void {
	const resolved = node.resolved;
	if (!resolved) {
		return;
	}

	const x = resolved.transform.position.x + node.params.canvasCenter.x;
	const y = resolved.transform.position.y + node.params.canvasCenter.y;
	const baseline = node.params.textBaseline ?? "middle";

	ctx.save();
	ctx.translate(x, y);
	ctx.scale(resolved.transform.scaleX, resolved.transform.scaleY);
	if (resolved.transform.rotate) {
		ctx.rotate((resolved.transform.rotate * Math.PI) / 180);
	}

	drawMeasuredTextLayout({
		ctx,
		layout: resolved.measuredText,
		textColor: resolved.textColor,
		background: resolved.measuredText.resolvedBackground,
		backgroundColor: resolved.backgroundColor,
		textBaseline: baseline,
	});

	ctx.restore();
}
