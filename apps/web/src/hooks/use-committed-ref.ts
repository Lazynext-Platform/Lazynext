/**
 * Hook that stores the latest value in a ref, updated synchronously
 * via `useLayoutEffect` to avoid stale closures.
 *
 * @module hooks/use-committed-ref
 */

import { useLayoutEffect, useRef } from "react";

/**
 * Stores `value` in a ref that is updated synchronously on every commit.
 *
 * @param value - the value to keep current in the ref.
 * @returns a mutable ref object whose `.current` always equals the
 *   latest `value`.
 */
export function useCommittedRef<T>(value: T) {
	const ref = useRef(value);

	useLayoutEffect(() => {
		ref.current = value;
	}, [value]);

	return ref;
}
