"use client";
/** @module Hook for keyframed parameter editing — preview, commit, and toggle keyframes */

import { useEditor } from "@/editor/use-editor";
import {
	buildGraphicParamPath,
	getKeyframeAtTime,
	hasKeyframesForPath,
	upsertPathKeyframe,
} from "@/animation";
import type { AnimationPath, ElementAnimations } from "@/animation/types";
import {
	coerceParamValue,
	getParamChannelLayout,
	type ParamDefinition,
} from "@/params";
import type { TimelineElement } from "@/timeline";
import type { MediaTime } from "@/wasm";

/** Type definition for KeyframedParamPropertyResult. */
export interface KeyframedParamPropertyResult {
	/** Whether the property has any keyframes. */
	hasAnimatedKeyframes: boolean;
	/** Whether a keyframe exists at the current time. */
	isKeyframedAtTime: boolean;
	/** Identifier of the keyframe at the current time, if any. */
	keyframeIdAtTime: string | null;
	/** Previews a value change. */
	onPreview: (value: number | string | boolean) => void;
	/** Commits the pending preview. */
	onCommit: () => void;
	/** Toggles a keyframe at the current time. */
	toggleKeyframe: () => void;
}

/** Custom hook providing useKeyframedParamProperty functionality. */
export function useKeyframedParamProperty({
	param,
	trackId,
	elementId,
	animations,
	propertyPath,
	localTime,
	isPlayheadWithinElementRange,
	resolvedValue,
	buildBaseUpdates,
}: {
	param: ParamDefinition;
	trackId: string;
	elementId: string;
	animations: ElementAnimations | undefined;
	propertyPath?: AnimationPath;
	localTime: MediaTime;
	isPlayheadWithinElementRange: boolean;
	resolvedValue: number | string | boolean;
	buildBaseUpdates: ({
		value,
	}: {
		value: number | string | boolean;
	}) => Partial<TimelineElement>;
}): KeyframedParamPropertyResult {
	const editor = useEditor();
	const resolvedPropertyPath =
		propertyPath ?? buildGraphicParamPath({ paramKey: param.key });
	const hasAnimatedKeyframes = hasKeyframesForPath({
		animations,
		propertyPath: resolvedPropertyPath,
	});
	const keyframeAtTime = isPlayheadWithinElementRange
		? getKeyframeAtTime({
				animations,
				propertyPath: resolvedPropertyPath,
				time: localTime,
			})
		: null;
	const keyframeIdAtTime = keyframeAtTime?.id ?? null;
	const isKeyframedAtTime = keyframeAtTime !== null;
	const shouldUseAnimatedChannel =
		hasAnimatedKeyframes && isPlayheadWithinElementRange;

	const previewValue: KeyframedParamPropertyResult["onPreview"] = (value) => {
		if (shouldUseAnimatedChannel) {
			editor.timeline.previewElements({
				updates: [
					{
						trackId,
						elementId,
						updates: {
							animations: upsertPathKeyframe({
								animations,
								propertyPath: resolvedPropertyPath,
								time: localTime,
								value,
								channelLayout: getParamChannelLayout({ param }),
								coerceValue: ({ value: nextValue }) =>
									coerceParamValue({
										param,
										value: nextValue,
									}),
							}),
						},
					},
				],
			});
			return;
		}

		editor.timeline.previewElements({
			updates: [
				{
					trackId,
					elementId,
					updates: buildBaseUpdates({ value }),
				},
			],
		});
	};

	const toggleKeyframe = () => {
		if (!isPlayheadWithinElementRange) {
			return;
		}

		if (keyframeIdAtTime) {
			editor.timeline.removeKeyframes({
				keyframes: [
					{
						trackId,
						elementId,
						propertyPath: resolvedPropertyPath,
						keyframeId: keyframeIdAtTime,
					},
				],
			});
			return;
		}

		editor.timeline.upsertKeyframes({
			keyframes: [
				{
					trackId,
					elementId,
					propertyPath: resolvedPropertyPath,
					time: localTime,
					value: resolvedValue,
				},
			],
		});
	};

	return {
		hasAnimatedKeyframes,
		isKeyframedAtTime,
		keyframeIdAtTime,
		onPreview: previewValue,
		onCommit: () => editor.timeline.commitPreview(),
		toggleKeyframe,
	};
}
