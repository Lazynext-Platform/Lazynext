/**
 * Global interaction cancellation registry.
 *
 * Allows drag operations, modal prompts, and other transient interactions
 * to register a cancel handler. When the user presses Escape, `cancelInteraction`
 * invokes all registered handlers, giving each the opportunity to abort
 * cleanly (e.g., discard a drag or dismiss a dialog).
 *
 * @module editor/cancel-interaction
 */

type CancelFn = () => void;

const cancellers = new Set<CancelFn>();

/**
 * Registers a cancel callback that will be called when the user triggers
 * a global cancel (e.g., pressing Escape).
 *
 * @param fn - the cancel function to register.
 * @returns a cleanup function that unregisters the canceller.
 */
export function registerCanceller({ fn }: { fn: CancelFn }): () => void {
	cancellers.add(fn);

	return () => {
		cancellers.delete(fn);
	};
}

/**
 * Invokes all registered cancel handlers and clears the registry.
 *
 * @returns true if any handlers were invoked, false if the registry was empty.
 */
export function cancelInteraction(): boolean {
	if (cancellers.size === 0) return false;

	const activeCancellers = Array.from(cancellers);
	cancellers.clear();

	for (const cancel of activeCancellers) {
		cancel();
	}

	return true;
}
