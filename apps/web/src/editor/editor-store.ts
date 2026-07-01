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
	isInitializing: boolean;
	isPanelsReady: boolean;
	canvasPresets: TCanvasSize[];
	setInitializing: (loading: boolean) => void;
	setPanelsReady: (ready: boolean) => void;
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
