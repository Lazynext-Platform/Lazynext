/** @module Root render node serving as the top-level compositor tree node */
import { BaseNode } from "./base-node";

/** Type definition for RootNodeParams. */
export type RootNodeParams = {
	/** Total timeline duration in seconds. */
	duration: number;
};

/** Class representing RootNode. */
export class RootNode extends BaseNode<RootNodeParams> {
	get duration() {
		return this.params.duration ?? 0;
	}
}
