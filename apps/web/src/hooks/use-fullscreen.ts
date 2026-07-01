/**
 * Hook for toggling fullscreen mode on a DOM element.
 *
 * Listens to `fullscreenchange` events and provides a toggle function
 * that enters/exits fullscreen for the referenced container.
 *
 * @module hooks/use-fullscreen
 */

import { useCallback, useEffect, useState } from "react";

/**
 * Manages fullscreen state for a given container element.
 *
 * @param containerRef - ref to the element to fullscreen.
 * @returns `isFullscreen` (boolean) and `toggleFullscreen` function.
 */
export function useFullscreen({
	containerRef,
}: {
	containerRef: React.RefObject<HTMLElement | null>;
}) {
	const [isFullscreen, setIsFullscreen] = useState(false);

	useEffect(() => {
		const handleChange = () => {
			setIsFullscreen(document.fullscreenElement !== null);
		};
		document.addEventListener("fullscreenchange", handleChange);
		return () => {
			document.removeEventListener("fullscreenchange", handleChange);
		};
	}, []);

	const toggleFullscreen = useCallback(() => {
		if (!containerRef.current) return;
		if (document.fullscreenElement) {
			document.exitFullscreen();
		} else {
			containerRef.current.requestFullscreen();
		}
	}, [containerRef]);

	return { isFullscreen, toggleFullscreen };
}
