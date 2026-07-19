/** @module Base command abstractions for the editor undo/redo system — defines the Command interface and selection result utilities. */
import type { EditorSelectionPatch } from "@/selection/editor-selection";
import type { ElementRef } from "@/timeline/types";

/** Type definition for CommandResult. */
export interface CommandResult {
	/** Optional selection patch to apply after the command. */
	selection?: EditorSelectionPatch;
}

/** Utility representing createElementSelectionResult. */
export function createElementSelectionResult(
	selectedElements: ElementRef[],
): CommandResult {
	return {
		selection: {
			selectedElements,
			selectedKeyframes: [],
			keyframeSelectionAnchor: null,
			selectedMaskPoints: null,
		},
	};
}

export abstract class Command {
	abstract execute(): CommandResult | undefined;

	abstract undo(): void;

	redo(): CommandResult | undefined {
		return this.execute();
	}
}
