/**
 * Lightweight ResizeObserver hook.
 *
 * Observes a container element and invokes a callback with the
 * ResizeObserverEntry whenever the element's dimensions change.
 *
 * @module hooks/use-resize-observer
 */

import { useEffect } from "react";

/**
 * Observes an element's size changes via ResizeObserver.
 *
 * @param ref - ref to the element to observe.
 * @param onResize - callback receiving the ResizeObserverEntry.
 */
export function useResizeObserver({
	ref,
	onResize,
}: {
	ref: React.RefObject<HTMLElement | null>;
	onResize: (entry: ResizeObserverEntry) => void;
}) {
	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				onResize(entry);
			}
		});

		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, [ref, onResize]);
}
