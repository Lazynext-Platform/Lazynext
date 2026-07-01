/**
 * @module ripple/shift
 * @description Low-level element shifting: moves every element that
 *   starts at or after a given time by a delta amount.
 */

import type { TimelineElement } from "@/timeline/types";

/**
 * Shifts all elements whose `startTime >= afterTime` by the given
 * amount (negative = pull left). Elements before the threshold are
 * unchanged.
 */
export function rippleShiftElements<TElement extends TimelineElement>({
	elements,
	afterTime,
	shiftAmount,
}: {
	elements: TElement[];
	afterTime: number;
	shiftAmount: number;
}): TElement[] {
	return elements.map((element) =>
		element.startTime >= afterTime
			? ({ ...element, startTime: element.startTime - shiftAmount } as TElement)
			: element,
	);
}
