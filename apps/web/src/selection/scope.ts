/** @module Selection scope tracking for managing multiple selection contexts */
export type ScopeEntry = {
	/** Returns true when the scope has an active selection. */
	hasSelection: () => boolean;
	/** Clears the selection in this scope. */
	clear: () => void;
	/** Optionally clears the active item without clearing selection. */
	clearActive?: () => void;
};

let activeScope: ScopeEntry | null = null;

/** Utility representing activateScope. */
export function activateScope({ entry }: { entry: ScopeEntry }): () => void {
	if (activeScope && activeScope !== entry) {
		activeScope.clear();
	}

	activeScope = entry;

	return () => {
		if (activeScope === entry) {
			activeScope = null;
		}
	};
}

/** Utility representing clearActiveScope. */
export function clearActiveScope(): boolean {
	if (!activeScope?.hasSelection()) {
		return false;
	}

	(activeScope.clearActive ?? activeScope.clear)();
	return true;
}
