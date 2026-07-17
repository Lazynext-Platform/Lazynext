/** @module Color render node for rendering solid color fill elements on the compositor */
import { BaseNode } from "./base-node";

/** Type definition for ColorNodeParams. */
export type ColorNodeParams = {
	/** CSS color string. */
	color: string;
};

/** Class representing ColorNode. */
export class ColorNode extends BaseNode<ColorNodeParams> {}
