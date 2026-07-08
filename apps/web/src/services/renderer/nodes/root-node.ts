/** @module Root render node serving as the top-level compositor tree node */
import { BaseNode } from "./base-node";

export type RootNodeParams = {
	/** Total timeline duration in seconds. */
	duration: number;
};

export class RootNode extends BaseNode<RootNodeParams> {
	get duration() {
		return this.params.duration ?? 0;
	}
}
