/** @module Video render node for decoding and rendering video frames on the compositor */
import {
	VisualNode,
	type ResolvedVisualSourceNodeState,
	type VisualNodeParams,
} from "./visual-node";

/** Type definition for VideoNodeParams. */
export interface VideoNodeParams extends VisualNodeParams {
	/** Source URL for the video asset. */
	url: string;
	/** Blob File reference for decoding. */
	file: File;
	/** Unique media asset identifier. */
	mediaId: string;
}

/** Class representing VideoNode. */
export class VideoNode extends VisualNode<
	VideoNodeParams,
	ResolvedVisualSourceNodeState
> {}
