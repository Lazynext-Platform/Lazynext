/** @module Persisted keybindings state type definitions for localStorage persistence */
export type PersistedKeybindingConfig = Record<string, string | undefined>;

/** Type definition for PersistedKeybindingsState. */
export interface PersistedKeybindingsState {
	/** Map of key combination to action ID. */
	keybindings: PersistedKeybindingConfig;
	/** Whether the user has customized the default bindings. */
	isCustomized: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Utility representing getPersistedKeybindingsState. */
export function getPersistedKeybindingsState({
	state,
}: {
	state: unknown;
}): PersistedKeybindingsState | null {
	if (!isRecord(state)) return null;

	const { keybindings, isCustomized } = state;
	if (!isRecord(keybindings) || typeof isCustomized !== "boolean") {
		return null;
	}

	const normalizedKeybindings: PersistedKeybindingConfig = {};
	for (const [key, action] of Object.entries(keybindings)) {
		if (action !== undefined && typeof action !== "string") {
			return null;
		}

		normalizedKeybindings[key] = action;
	}

	return {
		keybindings: normalizedKeybindings,
		isCustomized,
	};
}
