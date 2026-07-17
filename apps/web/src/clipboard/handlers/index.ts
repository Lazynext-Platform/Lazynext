/** @module Clipboard handlers barrel export and dispatcher for element and keyframe clipboard operations */
import type {
	ClipboardEntry,
	ClipboardEntryType,
	ClipboardHandler,
	ClipboardHandlerMap,
	CopyContext,
	PasteContext,
} from "../types";
import { ElementsClipboardHandler } from "./elements";
import { KeyframesClipboardHandler } from "./keyframes";

/** Utility representing clipboardHandlers. */
export const clipboardHandlers = {
	elements: ElementsClipboardHandler,
	keyframes: KeyframesClipboardHandler,
} satisfies ClipboardHandlerMap;

/** Utility representing clipboardCopyHandlers. */
export const clipboardCopyHandlers = [
	KeyframesClipboardHandler,
	ElementsClipboardHandler,
] as const satisfies readonly ClipboardHandler<ClipboardEntryType>[];

/** Utility representing copyClipboardEntry. */
export function copyClipboardEntry({
	context,
}: {
	context: CopyContext;
}): ClipboardEntry | null {
	for (const handler of clipboardCopyHandlers) {
		if (!handler.canCopy(context)) {
			continue;
		}

		return handler.copy(context);
	}

	return null;
}

/** Utility representing buildPasteClipboardCommand. */
export function buildPasteClipboardCommand({
	entry,
	context,
}: {
	entry: ClipboardEntry;
	context: PasteContext;
}) {
	const handler = clipboardHandlers[entry.type] as ClipboardHandler<
		typeof entry.type
	>;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
	return handler.paste({ entry: entry as never, context });
}
