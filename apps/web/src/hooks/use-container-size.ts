/**
 * Hook that tracks the pixel dimensions of a DOM container via
 * ResizeObserver.
 *
 * @module hooks/use-container-size
 */

import { useCallback, useState } from "react";
import { useResizeObserver } from "./use-resize-observer";

/**
 * Observes a container element and returns its current width/height.
 *
 * @param containerRef - ref to the element to observe.
 * @returns `{ width, height }` updated on resize.
 */
export function useContainerSize({
	containerRef,
}: {
	containerRef: React.RefObject<HTMLElement | null>;
}) {
	const [size, setSize] = useState({ width: 0, height: 0 });

	const onResize = useCallback((entry: ResizeObserverEntry) => {
		const { width, height } = entry.contentRect;
		setSize({ width, height });
	}, []);

	useResizeObserver({ ref: containerRef, onResize });

	return size;
}
