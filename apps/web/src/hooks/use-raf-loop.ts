/**
 * Hook that runs a callback on every animation frame with delta time.
 *
 * Uses `requestAnimationFrame` to create a render loop. The callback
 * receives the elapsed time in milliseconds since the last frame.
 *
 * @module hooks/use-raf-loop
 */

import { useEffect, useRef } from "react";

/**
 * Invokes `callback` on every animation frame with the delta time.
 *
 * @param callback - function called with `{ time }` where `time` is
 *   the elapsed milliseconds since the previous frame.
 */
export function useRafLoop(callback: ({ time }: { time: number }) => void) {
	const requestRef = useRef<number>(0);
	const previousTimeRef = useRef<number | null>(null);

	useEffect(() => {
		const loop = ({ time }: { time: number }) => {
			if (previousTimeRef.current !== null) {
				const deltaTime = time - previousTimeRef.current;
				callback({ time: deltaTime });
			}
			previousTimeRef.current = time;
			requestRef.current = requestAnimationFrame((time) => loop({ time }));
		};

		requestRef.current = requestAnimationFrame((time) => loop({ time }));
		return () => cancelAnimationFrame(requestRef.current);
	}, [callback]);
}
