/** @module Hook for generating help text and search data for keyboard shortcuts */
"use client";

import { useMemo } from "react";
import { useKeybindingsStore } from "@/actions/keybindings-store";
import { ACTIONS, type TActionWithOptionalArgs } from "@/actions";
import {
	getPlatformAlternateKey,
	getPlatformSpecialKey,
} from "@/utils/platform";

/** Type definition for KeyboardShortcut. */
export interface KeyboardShortcut {
	/** Unique action identifier. */
	id: string;
	/** Human-readable key combination strings. */
	keys: string[];
	/** Description of the shortcut action. */
	description: string;
	/** Category for grouping. */
	category: string;
	/** Associated action type. */
	action: TActionWithOptionalArgs;
	/** Optional icon element. */
	icon?: React.ReactNode;
}

function formatKey({ key }: { key: string }): string {
	return key
		.replace("ctrl", getPlatformSpecialKey())
		.replace("alt", getPlatformAlternateKey())
		.replace("shift", "Shift")
		.replace("left", "←")
		.replace("right", "→")
		.replace("up", "↑")
		.replace("down", "↓")
		.replace("space", "Space")
		.replace("home", "Home")
		.replace("enter", "Enter")
		.replace("end", "End")
		.replace("delete", "Delete")
		.replace("backspace", "Backspace")
		.replace("-", "+");
}

/** Custom hook providing useKeyboardShortcutsHelp functionality. */
export function useKeyboardShortcutsHelp() {
	const { keybindings } = useKeybindingsStore();

	const shortcuts = useMemo(() => {
		const actionToKeys = new Map<TActionWithOptionalArgs, string[]>();

		for (const [key, action] of keybindings) {
			const existing = actionToKeys.get(action);
			if (existing) {
				existing.push(formatKey({ key }));
			} else {
				actionToKeys.set(action, [formatKey({ key })]);
			}
		}

		const result: KeyboardShortcut[] = [];
		for (const [action, keys] of actionToKeys) {
			const actionDef = ACTIONS[action];
			if (!actionDef) continue;
			result.push({
				id: action,
				keys,
				description: actionDef.description,
				category: actionDef.category,
				action,
			});
		}

		return result.sort((a, b) => {
			if (a.category !== b.category) {
				return a.category.localeCompare(b.category);
			}
			return a.description.localeCompare(b.description);
		});
	}, [keybindings]);

	return {
		shortcuts,
	};
}
