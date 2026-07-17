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

/** Type definition for ElementClipboardItem. */
export interface ElementClipboardItem {
	/** ID of the source track. */
	trackId: string;
	/** Type of the source track. */
	trackType: TrackType;
	/** Element creation payload. */
	element: CreateTimelineElement;
}

/** Type definition for KeyframeClipboardCurvePatch. */
export interface KeyframeClipboardCurvePatch {
	/** Component key the patch targets. */
	componentKey: string;
	/** Scalar curve keyframe patch data. */
	patch: ScalarCurveKeyframePatch;
}

/** Type definition for KeyframeClipboardItem. */
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

/** Type definition for ElementsClipboardEntry. */
export interface ElementsClipboardEntry {
	/** Entry type discriminator. */
	type: "elements";
	/** Copied element data. */
	items: ElementClipboardItem[];
}

/** Type definition for KeyframesClipboardEntry. */
export interface KeyframesClipboardEntry {
	/** Entry type discriminator. */
	type: "keyframes";
	/** Source element reference. */
	sourceElement: ElementRef;
	/** Copied keyframe data. */
	items: KeyframeClipboardItem[];
}

/** Type definition for ClipboardEntryByType. */
export interface ClipboardEntryByType {
	/** Element clipboard entries. */
	elements: ElementsClipboardEntry;
	/** Keyframe clipboard entries. */
	keyframes: KeyframesClipboardEntry;
}

/** Type definition for ClipboardEntry. */
export type ClipboardEntry = ClipboardEntryByType[keyof ClipboardEntryByType];
/** Type definition for ClipboardEntryType. */
export type ClipboardEntryType = keyof ClipboardEntryByType;

/** Type definition for CopyContext. */
export interface CopyContext {
	/** Editor core instance. */
	editor: EditorCore;
	/** Currently selected elements. */
	selectedElements: ElementRef[];
	/** Currently selected keyframes. */
	selectedKeyframes: SelectedKeyframeRef[];
}

/** Type definition for PasteContext. */
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

/** Type definition for ClipboardHandler. */
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

/** Type definition for ClipboardHandlerMap. */
export type ClipboardHandlerMap = {
	[TType in ClipboardEntryType]: ClipboardHandler<TType>;
};
