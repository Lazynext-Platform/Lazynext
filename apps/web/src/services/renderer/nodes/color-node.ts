/** @module Color render node for rendering solid color fill elements on the compositor */
import { BaseNode } from "./base-node";

export type ColorNodeParams = {
	/** CSS color string. */
	color: string;
};

export class ColorNode extends BaseNode<ColorNodeParams> {}
