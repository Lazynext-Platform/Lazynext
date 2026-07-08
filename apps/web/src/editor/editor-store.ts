/**
 * Lightweight editor-level Zustand store for app initialization state
 * and canvas presets.
 *
 * Tracks whether the editor is still initializing, whether panels have
 * mounted, and holds the available canvas size presets. This store is
 * separate from the heavier EditorCore state.
 *
 * @module editor/editor-store
 */

import { create } from "zustand";
import { DEFAULT_CANVAS_PRESETS } from "@/canvas/sizes";
import type { TCanvasSize } from "@/project/types";

interface EditorState {
	/** Whether the editor is still initializing. */
	isInitializing: boolean;
	/** Whether editor panels have mounted. */
	isPanelsReady: boolean;
	/** Available canvas size presets. */
	canvasPresets: TCanvasSize[];
	/** Set the initializing flag. */
	setInitializing: (loading: boolean) => void;
	/** Set the panels-ready flag. */
	setPanelsReady: (ready: boolean) => void;
	/** Run the full editor initialization sequence. */
	initializeApp: () => Promise<void>;
}

/**
 * Zustand store for editor initialization state and canvas presets.
 */
export const useEditorStore = create<EditorState>()((set) => ({
	isInitializing: true,
	isPanelsReady: false,
	canvasPresets: DEFAULT_CANVAS_PRESETS,
	setInitializing: (loading) => set({ isInitializing: loading }),
	setPanelsReady: (ready) => set({ isPanelsReady: ready }),
	initializeApp: async () => {
		set({ isInitializing: true, isPanelsReady: false });
		set({ isPanelsReady: true, isInitializing: false });
	},
}));
