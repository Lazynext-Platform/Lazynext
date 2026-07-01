/**
 * Hook for managing preview state within dropdown menus.
 *
 * When a user opens a dropdown (e.g., an effects menu), this hook
 * tracks whether a preview was committed or should be discarded on
 * close. On pointer leave or menu close, discards uncommitted
 * timeline previews.
 *
 * @module editor/use-menu-preview
 */

import { useRef } from "react";
import { useEditor } from "@/editor/use-editor";

/**
 * Manages preview lifecycle for dropdown menu interactions.
 *
 * @returns an object with `onPointerLeave`, `onOpenChange`, and
 *   `markCommitted` callbacks for controlling preview commits
 *   within dropdown menus.
 */
export function useMenuPreview() {
	const editor = useEditor();
	const didCommitRef = useRef(false);

	const discard = () => {
		if (!didCommitRef.current && editor.timeline.isPreviewActive()) {
			editor.timeline.discardPreview();
		}
	};

	const markCommitted = () => {
		didCommitRef.current = true;
	};

	const onOpenChange = (isOpen: boolean) => {
		if (!isOpen) {
			discard();
			didCommitRef.current = false;
		}
	};

	return { onPointerLeave: discard, onOpenChange, markCommitted };
}
