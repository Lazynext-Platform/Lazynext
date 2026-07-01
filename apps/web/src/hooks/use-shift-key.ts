/**
 * Hook that tracks whether the Shift key is currently held.
 *
 * Returns a ref that stays up-to-date via global keydown/keyup/blur
 * listeners, avoiding re-renders for this high-frequency state.
 *
 * @module hooks/use-shift-key
 */

import { useEffect, useRef, type RefObject } from "react";

/**
 * Tracks Shift key state without causing re-renders.
 *
 * @returns a ref whose `.current` is `true` while Shift is held.
 */
export function useShiftKey(): RefObject<boolean> {
	const isShiftHeldRef = useRef(false);

	useEffect(() => {
		const handleKeyDown = ({ key }: KeyboardEvent) => {
			if (key === "Shift") {
				isShiftHeldRef.current = true;
			}
		};

		const handleKeyUp = ({ key }: KeyboardEvent) => {
			if (key === "Shift") {
				isShiftHeldRef.current = false;
			}
		};

		const handleBlur = () => {
			isShiftHeldRef.current = false;
		};

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("keyup", handleKeyUp);
		window.addEventListener("blur", handleBlur);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("blur", handleBlur);
		};
	}, []);

	return isShiftHeldRef;
}
