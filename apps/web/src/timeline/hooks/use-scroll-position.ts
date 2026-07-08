/**
 * Reactive hook tracking the scrollLeft and viewportWidth of a scroll
 * container via scroll events and ResizeObserver, throttled to rAF.
 *
 * @module timeline/hooks/use-scroll-position
 */

import { useEffect, useState, useRef } from "react";

interface UseScrollPositionReturn {
	/** Current horizontal scroll offset in pixels. */
	scrollLeft: number;
	/** Current viewport width in pixels. */
	viewportWidth: number;
}

/**
 * Returns `{ scrollLeft, viewportWidth }` for the given scroll container,
 * updating on scroll and resize.
 */
export function useScrollPosition({
	scrollRef,
}: {
	scrollRef: React.RefObject<HTMLElement | null>;
}): UseScrollPositionReturn {
	const [scrollLeft, setScrollLeft] = useState(0);
	const [viewportWidth, setViewportWidth] = useState(0);
	const rafIdRef = useRef<number | null>(null);

	useEffect(() => {
		const scrollElement = scrollRef.current;
		if (!scrollElement) return;

		const updatePosition = () => {
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
			}

			rafIdRef.current = requestAnimationFrame(() => {
				setScrollLeft(scrollElement.scrollLeft);
				setViewportWidth(scrollElement.clientWidth);
				rafIdRef.current = null;
			});
		};

		const resizeObserver = new ResizeObserver(() => {
			updatePosition();
		});

		updatePosition();

		scrollElement.addEventListener("scroll", updatePosition, { passive: true });
		resizeObserver.observe(scrollElement);

		return () => {
			scrollElement.removeEventListener("scroll", updatePosition);
			resizeObserver.disconnect();
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, [scrollRef]);

	return { scrollLeft, viewportWidth };
}
