/** @module Clipboard type definitions for element and keyframe clipboard operations */
import type { EditorCore } from "@/core";
import type {
	AnimationInterpolation,
	AnimationPath,
	ScalarCurveKeyframePatch,
	SelectedKeyframeRef,
} from "@/animation/types";
import type { ParamValue } from "@/params";
import type { Command } from "@/commands/base-command";
import type { CreateTimelineElement, ElementRef, TrackType } from "@/timeline";
import type { MediaTime } from "@/wasm";

export interface ElementClipboardItem {
	/** ID of the source track. */
	trackId: string;
	/** Type of the source track. */
	trackType: TrackType;
	/** Element creation payload. */
	element: CreateTimelineElement;
}

export interface KeyframeClipboardCurvePatch {
	/** Component key the patch targets. */
	componentKey: string;
	/** Scalar curve keyframe patch data. */
	patch: ScalarCurveKeyframePatch;
}

export interface KeyframeClipboardItem {
	/** Animation property path. */
	propertyPath: AnimationPath;
	/** Time offset relative to clipboard origin. */
	timeOffset: MediaTime;
	/** Keyframe value. */
	value: ParamValue;
	/** Interpolation mode. */
	interpolation: AnimationInterpolation;
	/** Associated curve patches. */
	curvePatches: KeyframeClipboardCurvePatch[];
}

export interface ElementsClipboardEntry {
	/** Entry type discriminator. */
	type: "elements";
	/** Copied element data. */
	items: ElementClipboardItem[];
}

export interface KeyframesClipboardEntry {
	/** Entry type discriminator. */
	type: "keyframes";
	/** Source element reference. */
	sourceElement: ElementRef;
	/** Copied keyframe data. */
	items: KeyframeClipboardItem[];
}

export interface ClipboardEntryByType {
	/** Element clipboard entries. */
	elements: ElementsClipboardEntry;
	/** Keyframe clipboard entries. */
	keyframes: KeyframesClipboardEntry;
}

export type ClipboardEntry = ClipboardEntryByType[keyof ClipboardEntryByType];
export type ClipboardEntryType = keyof ClipboardEntryByType;

export interface CopyContext {
	/** Editor core instance. */
	editor: EditorCore;
	/** Currently selected elements. */
	selectedElements: ElementRef[];
	/** Currently selected keyframes. */
	selectedKeyframes: SelectedKeyframeRef[];
}

export interface PasteContext {
	/** Editor core instance. */
	editor: EditorCore;
	/** Currently selected elements at paste time. */
	selectedElements: ElementRef[];
	/** Currently selected keyframes at paste time. */
	selectedKeyframes: SelectedKeyframeRef[];
	/** Playhead time for paste placement. */
	time: MediaTime;
}

export interface ClipboardHandler<TType extends ClipboardEntryType> {
	/** Clipboard entry type this handler processes. */
	type: TType;
	/** Whether this handler can copy from the given context. */
	canCopy(context: CopyContext): boolean;
	/** Produce a clipboard entry from the copy context. */
	copy(context: CopyContext): ClipboardEntryByType[TType] | null;
	/** Produce a command for pasting the given entry. */
	paste(args: {
		/** Clipboard entry to paste. */
		entry: ClipboardEntryByType[TType];
		/** Current paste context. */
		context: PasteContext;
	}): Command | null;
}

export type ClipboardHandlerMap = {
	[TType in ClipboardEntryType]: ClipboardHandler<TType>;
};
