/**
 * Persistent Zustand store for editor panel sizes.
 *
 * Stores the pixel dimensions of the main editor panels (tools, preview,
 * properties, mainContent, timeline) and persists them to localStorage.
 * Includes a migration path for older panel state shapes.
 *
 * @module editor/panel-store
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PANEL_CONFIG } from "@/panels/layout";

/**
 * Pixel dimensions for each resizable editor panel.
 */
export interface PanelSizes {
	/** Width of the tools panel in pixels. */
	tools: number;
	/** Width of the preview panel in pixels. */
	preview: number;
	/** Width of the properties panel in pixels. */
	properties: number;
	/** Width of the main content area in pixels. */
	mainContent: number;
	/** Height of the timeline panel in pixels. */
	timeline: number;
}

/** Identifier for a single resizable panel in the editor layout. */
export type PanelId = keyof PanelSizes;

interface PanelState {
	/** Current pixel sizes for each panel. */
	panels: PanelSizes;
	/** Update the size of a single panel. */
	setPanel: (args: { panel: PanelId; size: number }) => void;
	/** Partially update multiple panel sizes at once. */
	setPanels: (sizes: Partial<PanelSizes>) => void;
	/** Reset all panel sizes to defaults. */
	resetPanels: () => void;
}

/**
 * Zustand hook for reading and mutating editor panel sizes.
 *
 * Persisted to localStorage under the key `"panel-sizes"` with automatic
 * migration from older panel state shapes.
 */
export const usePanelStore = create<PanelState>()(
	persist(
		(set) => ({
			...PANEL_CONFIG,
			setPanel: ({ panel, size }) =>
				set((state) => ({
					panels: {
						...state.panels,
						[panel]: size,
					},
				})),
			setPanels: (sizes) =>
				set((state) => ({
					panels: {
						...state.panels,
						...sizes,
					},
				})),
			resetPanels: () => set({ ...PANEL_CONFIG }),
		}),
		{
			name: "panel-sizes",
			version: 2,
			migrate: (persistedState) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
				const state = persistedState as
					| {
							panels?: Partial<PanelSizes> | null;
							toolsPanel?: number;
							previewPanel?: number;
							propertiesPanel?: number;
							mainContent?: number;
							timeline?: number;
							tools?: number;
							preview?: number;
							properties?: number;
					  }
					| undefined
					| null;

				if (!state) return { panels: { ...PANEL_CONFIG.panels } };

				if (state.panels && typeof state.panels === "object") {
					return {
						panels: {
							...PANEL_CONFIG.panels,
							...state.panels,
						},
					};
				}

				return {
					panels: {
						tools: state.tools ?? state.toolsPanel ?? PANEL_CONFIG.panels.tools,
						preview:
							state.preview ??
							state.previewPanel ??
							PANEL_CONFIG.panels.preview,
						properties:
							state.properties ??
							state.propertiesPanel ??
							PANEL_CONFIG.panels.properties,
						mainContent: state.mainContent ?? PANEL_CONFIG.panels.mainContent,
						timeline: state.timeline ?? PANEL_CONFIG.panels.timeline,
					},
				};
			},
			partialize: (state) => ({
				panels: state.panels,
			}),
		},
	),
);
