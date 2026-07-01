/**
 * React hook for accessing the singleton {@link EditorCore} with selective subscriptions.
 *
 * Uses {@link useSyncExternalStore} to keep the component tree in sync with the
 * editor's internal state. When called without a selector, it subscribes to no
 * granular updates and returns the full EditorCore instance. When called with a
 * selector, it subscribes to all editor substores and returns only the derived
 * value, with shallow-equality memoization to prevent unnecessary re-renders.
 */

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { EditorCore } from "@/core";

const SNAPSHOT_UNSET = Symbol("snapshotUnset");

function isShallowEqual({ a, b }: { a: unknown; b: unknown }): boolean {
	if (Object.is(a, b)) return true;
	if (!Array.isArray(a) || !Array.isArray(b)) return false;
	if (a.length !== b.length) return false;
	return a.every((item, i) => Object.is(item, b[i]));
}

const subscribeNone = () => () => {};

/**
 * Returns the singleton EditorCore instance without granular subscriptions.
 * Use this when the consuming component needs access to multiple editor methods
 * and does not need to re-render on state changes.
 */
export function useEditor(): EditorCore;
/**
 * Returns a derived value from the EditorCore, automatically re-rendering the
 * component when the selected value changes (shallow-equality comparison).
 *
 * @param selector — a pure function that extracts a subset of state from the editor.
 * @returns The current value of the selected state slice.
 */
export function useEditor<T>(selector: (editor: EditorCore) => T): T;
/**
 * @param selector — optional selector function. When provided, the hook subscribes
 *   to all editor stores and runs the selector on every store change; when omitted,
 *   the hook returns the raw EditorCore instance with no subscription overhead.
 * @returns Either the full EditorCore or the derived value from the selector.
 */
export function useEditor<T>(
	selector?: (editor: EditorCore) => T,
): EditorCore | T {
	const editor = useMemo(() => EditorCore.getInstance(), []);
	const snapshotCacheRef = useRef<T | typeof SNAPSHOT_UNSET>(SNAPSHOT_UNSET);

	const subscribeAll = useCallback(
		(onChange: () => void) => {
			const unsubscribers = [
				editor.playback.subscribe(onChange),
				editor.timeline.subscribe(onChange),
				editor.scenes.subscribe(onChange),
				editor.project.subscribe(onChange),
				editor.media.subscribe(onChange),
				editor.renderer.subscribe(onChange),
				editor.selection.subscribe(onChange),
				editor.clipboard.subscribe(onChange),
				editor.diagnostics.subscribe(onChange),
			];
			return () => {
				unsubscribers.forEach((unsubscribe) => {
					unsubscribe();
				});
			};
		},
		[editor],
	);

	const getSnapshot = useCallback((): EditorCore | T => {
		if (!selector) {
			return editor;
		}

		const next = selector(editor);
		if (
			snapshotCacheRef.current !== SNAPSHOT_UNSET &&
			isShallowEqual({
				a: snapshotCacheRef.current,
				b: next,
			})
		) {
			return snapshotCacheRef.current;
		}

		snapshotCacheRef.current = next;
		return next;
	}, [editor, selector]);

	return useSyncExternalStore(
		selector ? subscribeAll : subscribeNone,
		getSnapshot,
		getSnapshot,
	);
}
