/**
 * Element update pipeline — applies derive/enforce rules when timeline
 * element fields change, ensuring derived values (duration from retime,
 * clamped animations) stay consistent.
 *
 * @module timeline/update-pipeline
 */

import { clampAnimationsToDuration } from "@/animation";
import {
	clampRetimeRate,
	getSourceSpanAtClipTime,
	getTimelineDurationForSourceSpan,
} from "@/retime";
import type { RetimeConfig, SceneTracks, TimelineElement } from "@/timeline";
import { isRetimableElement } from "@/timeline";
import { ZERO_MEDIA_TIME, roundMediaTime } from "@/wasm";

type ElementUpdateField = keyof TimelineElement | string;

/** Context provided to update rules so they can reason about sibling tracks/elements. */
export interface ElementUpdateContext {
	/** All tracks in the current scene. */
	tracks: SceneTracks;
	/** Identifier of the track being updated. */
	trackId: string;
}

interface ElementUpdateRuleResult {
	/** The element after the rule has been applied. */
	element: TimelineElement;
	/** Fields that were modified by this rule. */
	changedFields?: ElementUpdateField[];
}

interface ElementUpdateRuleParams {
	/** The element being updated. */
	element: TimelineElement;
	/** Snapshot of the element before any rules were applied. */
	originalElement: TimelineElement;
	/** The user-supplied partial update. */
	patch: Partial<TimelineElement>;
	/** Context with sibling track/element info. */
	context: ElementUpdateContext;
}

interface ElementUpdateRule {
	/** Field names that trigger this rule when changed. */
	triggers: ElementUpdateField[];
	/** Apply the rule and return the updated element. */
	apply: (params: ElementUpdateRuleParams) => ElementUpdateRuleResult;
}

const deriveRules: ElementUpdateRule[] = [
	{
		triggers: ["retime"],
		apply: ({ element, originalElement, patch }) => {
			if (!("retime" in patch) || !isRetimableElement(element)) {
				return { element };
			}

			const nextRetime = patch.retime
				? {
						...patch.retime,
						rate: clampRetimeRate({ rate: patch.retime.rate }),
					}
				: undefined;

			const sourceDuration = getSourceDuration({
				trimStart: originalElement.trimStart,
				trimEnd: originalElement.trimEnd,
				duration: originalElement.duration,
				sourceDuration: isRetimableElement(originalElement)
					? originalElement.sourceDuration
					: undefined,
				retime: isRetimableElement(originalElement)
					? originalElement.retime
					: undefined,
			});
			const visibleSourceSpan = Math.max(
				0,
				sourceDuration - element.trimStart - element.trimEnd,
			);
			const nextDuration = roundMediaTime({
				time: getTimelineDurationForSourceSpan({
					sourceSpan: visibleSourceSpan,
					retime: nextRetime,
				}),
			});

			return {
				element: {
					...element,
					retime: nextRetime,
					duration: nextDuration,
				},
				changedFields: ["retime", "duration"],
			};
		},
	},
];

const enforceRules: ElementUpdateRule[] = [
	{
		triggers: ["duration"],
		apply: ({ element }) => ({
			element: {
				...element,
				animations: clampAnimationsToDuration({
					animations: element.animations,
					duration: element.duration,
				}),
			},
		}),
	},
	{
		triggers: ["startTime"],
		apply: ({ element, context }) => {
			const requestedStartTime =
				element.startTime < ZERO_MEDIA_TIME
					? ZERO_MEDIA_TIME
					: element.startTime;
			if (context.trackId !== context.tracks.main.id) {
				return {
					element: {
						...element,
						startTime: requestedStartTime,
					},
				};
			}

			const earliestElement = context.tracks.main.elements
				.filter((candidate) => candidate.id !== element.id)
				.reduce<TimelineElement | null>((earliest, candidate) => {
					if (!earliest || candidate.startTime < earliest.startTime) {
						return candidate;
					}
					return earliest;
				}, null);

			return {
				element: {
					...element,
					startTime:
						!earliestElement || requestedStartTime <= earliestElement.startTime
							? ZERO_MEDIA_TIME
							: requestedStartTime,
				},
			};
		},
	},
];

/**
 * Applies a partial update to an element, running derive and enforce
 * rules to keep secondary fields (duration, animations) consistent.
 *
 * @returns the updated element after all rules have been applied.
 */
export function applyElementUpdate({
	element,
	patch,
	context,
}: {
	element: TimelineElement;
	patch: Partial<TimelineElement>;
	context: ElementUpdateContext;
}): TimelineElement {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
	let nextElement = {
		...element,
		...patch,
		params: {
			...element.params,
			...(patch.params ?? {}),
		},
	} as TimelineElement;
	const changedFields = new Set(Object.keys(patch) as ElementUpdateField[]);

	for (const rule of deriveRules) {
		if (!shouldApplyRule({ rule, changedFields })) {
			continue;
		}

		const result = rule.apply({
			element: nextElement,
			originalElement: element,
			patch,
			context,
		});
		nextElement = result.element;
		for (const field of result.changedFields ?? []) {
			changedFields.add(field);
		}
	}

	for (const rule of enforceRules) {
		if (!shouldApplyRule({ rule, changedFields })) {
			continue;
		}

		nextElement = rule.apply({
			element: nextElement,
			originalElement: element,
			patch,
			context,
		}).element;
	}

	return nextElement;
}

function shouldApplyRule({
	rule,
	changedFields,
}: {
	rule: ElementUpdateRule;
	changedFields: Set<ElementUpdateField>;
}): boolean {
	return rule.triggers.some((trigger) => changedFields.has(trigger));
}

function getSourceDuration({
	trimStart,
	trimEnd,
	duration,
	sourceDuration,
	retime,
}: {
	trimStart: number;
	trimEnd: number;
	duration: number;
	sourceDuration?: number;
	retime?: RetimeConfig;
}): number {
	if (typeof sourceDuration === "number") {
		return sourceDuration;
	}

	return (
		trimStart +
		getSourceSpanAtClipTime({
			clipTime: duration,
			retime,
		}) +
		trimEnd
	);
}
