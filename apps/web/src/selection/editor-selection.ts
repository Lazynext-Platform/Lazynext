/** @module Editor-level selection state compositing element and keyframe selections */
import type { SelectedKeyframeRef } from "@/animation/types";
import type { ElementRef } from "@/timeline/types";

/** Type definition for SelectedMaskPointSelection. */
export interface SelectedMaskPointSelection {
	/** Track identifier of the mask element. */
	trackId: string;
	/** Element identifier of the mask. */
	elementId: string;
	/** Mask identifier within the element. */
	maskId: string;
	/** Selected point IDs within the mask. */
	pointIds: string[];
}

/** Type definition for EditorSelectionSnapshot. */
export interface EditorSelectionSnapshot {
	/** Currently selected elements. */
	selectedElements: ElementRef[];
	/** Currently selected keyframes. */
	selectedKeyframes: SelectedKeyframeRef[];
	/** Anchor keyframe for range selection. */
	keyframeSelectionAnchor: SelectedKeyframeRef | null;
	/** Currently selected mask points, if any. */
	selectedMaskPoints: SelectedMaskPointSelection | null;
}

/** Type definition for EditorSelectionPatch. */
export interface EditorSelectionPatch {
	/** Updated element selection. */
	selectedElements?: ElementRef[];
	/** Updated keyframe selection. */
	selectedKeyframes?: SelectedKeyframeRef[];
	/** Updated keyframe selection anchor. */
	keyframeSelectionAnchor?: SelectedKeyframeRef | null;
	/** Updated mask point selection. */
	selectedMaskPoints?: SelectedMaskPointSelection | null;
}

/** Type definition for EditorSelectionKind. */
export type EditorSelectionKind = "mask-points" | "keyframes" | "elements";
