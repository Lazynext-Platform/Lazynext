/**
 * Focus lock hook for modal dialogs and overlays.
 *
 * When active, prevents pointer events on everything outside the
 * locked container. Clicking outside dismisses the lock. Supports
 * an optional CSS selector for elements that should remain interactive.
 *
 * @module hooks/use-focus-lock
 */

import { useEffect, useRef } from "react";
import { useCommittedRef } from "@/hooks/use-committed-ref";

type FocusLockCursor = "text" | "default" | "pointer" | "crosshair";

const DATA_ATTR = "data-focus-locked";

function buildFocusLockCSS({
	cursor,
	allowSelector,
}: {
	cursor: FocusLockCursor;
	allowSelector?: string;
}) {
	const rules = [
		`*, *::before, *::after { pointer-events: none !important; cursor: ${cursor} !important; }`,
		`[${DATA_ATTR}], [${DATA_ATTR}] * { pointer-events: auto !important; cursor: auto !important; }`,
	];

	if (allowSelector) {
		rules.push(
			`${allowSelector} { pointer-events: auto !important; cursor: auto !important; }`,
		);
	}

	return rules.join("\n");
}

/**
 * Locks focus and pointer events to a container element.
 *
 * @param isActive - when true, the lock is engaged.
 * @param onDismiss - called when the user clicks outside the container.
 * @param cursor - cursor style to apply to locked-out elements (default "default").
 * @param allowSelector - CSS selector for elements that bypass the lock.
 * @returns a ref to attach to the container element.
 */
export function useFocusLock<T extends HTMLElement = HTMLElement>({
	isActive,
	onDismiss,
	cursor = "default",
	allowSelector,
}: {
	isActive: boolean;
	onDismiss: () => void;
	cursor?: FocusLockCursor;
	allowSelector?: string;
}) {
	const containerRef = useRef<T>(null);
	const onDismissRef = useCommittedRef(onDismiss);

	useEffect(() => {
		if (!isActive) return;
		const container = containerRef.current;
		if (!container) return;

		container.setAttribute(DATA_ATTR, "");

		const focusLockStyle = document.createElement("style");
		focusLockStyle.textContent = buildFocusLockCSS({ cursor, allowSelector });
		document.head.appendChild(focusLockStyle);

		const handleOutsidePointerDown = (event: PointerEvent) => {
			if (event.button !== 0) return;
			const target = event.target;
			if (target instanceof Node && container.contains(target)) return;

			const isAllowedTarget =
				allowSelector &&
				target instanceof Element &&
				target.closest(allowSelector);
			if (isAllowedTarget) return;

			onDismissRef.current();
		};

		document.addEventListener("pointerdown", handleOutsidePointerDown, true);

		return () => {
			document.removeEventListener(
				"pointerdown",
				handleOutsidePointerDown,
				true,
			);
			container.removeAttribute(DATA_ATTR);
			focusLockStyle.remove();
		};
	}, [isActive, cursor, allowSelector, onDismissRef]);

	return { containerRef };
}
