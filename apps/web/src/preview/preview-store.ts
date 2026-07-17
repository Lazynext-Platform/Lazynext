/** @module Zustand store for preview viewport state including zoom, pan, guides, and overlays */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isGuideId, type GuideId } from "@/guides";
import { DEFAULT_GRID_CONFIG } from "@/guides/grid";
import type { GridConfig } from "@/guides/types";

type PreviewOverlaysState = Record<string, boolean>;

interface PersistedPreviewState {
	/** Persisted active guide identifier. */
	activeGuide?: string | null;
	/** Legacy persisted layout guide settings. */
	layoutGuide?: {
		/** Persisted platform identifier. */
		platform?: string | null;
	};
	/** Persisted overlay visibility map. */
	overlays?: PreviewOverlaysState;
	/** Persisted grid configuration. */
	gridConfig?: GridConfig;
	/** Persisted custom guide lines. */
	customLines?: Array<{ axis: "x" | "y"; percent: number }>;
}

interface PreviewState {
	/** Currently active guide, if any. */
	activeGuide: GuideId | null;
	/** Overlay visibility state by overlay id. */
	overlays: PreviewOverlaysState;
	/** Current grid configuration. */
	gridConfig: GridConfig;
	/** Custom guide lines. */
	customLines: Array<{ axis: "x" | "y"; percent: number }>;
	/** Toggles the given guide on or off. */
	toggleGuide: (guideId: GuideId) => void;
	/** Merges partial grid configuration. */
	setGridConfig: (config: Partial<GridConfig>) => void;
	/** Adds a custom guide line. */
	addCustomLine: (axis: "x" | "y", percent: number) => void;
	/** Removes all custom guide lines. */
	clearCustomLines: () => void;
	/** Sets visibility of an overlay. */
	setOverlayVisibility: ({
		overlayId,
		isVisible,
	}: {
		/** Identifier of the overlay to set. */
		overlayId: string;
		/** Whether the overlay should be visible. */
		isVisible: boolean;
	}) => void;
	/** Toggles visibility of an overlay. */
	toggleOverlayVisibility: ({ overlayId }: {
		/** Identifier of the overlay to toggle. */
		overlayId: string;
	}) => void;
}

const DEFAULT_PREVIEW_OVERLAYS: PreviewOverlaysState = {};

function getPersistedActiveGuide(
	state: PersistedPreviewState | undefined,
): GuideId | null {
	const persistedGuide =
		state?.activeGuide ?? state?.layoutGuide?.platform ?? null;

	if (typeof persistedGuide !== "string") {
		return null;
	}

	return isGuideId(persistedGuide) ? persistedGuide : null;
}

/** Custom hook providing usePreviewStore functionality. */
export const usePreviewStore = create<PreviewState>()(
	persist(
		(set) => ({
			activeGuide: null,
			overlays: DEFAULT_PREVIEW_OVERLAYS,
			gridConfig: DEFAULT_GRID_CONFIG,
			customLines: [],
			toggleGuide: (guideId) => {
				set((state) => ({
					activeGuide: state.activeGuide === guideId ? null : guideId,
				}));
			},
			setGridConfig: (config) => {
				set((state) => ({
					gridConfig: { ...state.gridConfig, ...config },
				}));
			},
			// eslint-disable-next-line lazynext/prefer-object-params
			addCustomLine: (axis, percent) => {
				set((state) => ({
					customLines: [...state.customLines, { axis, percent }],
				}));
			},
			clearCustomLines: () => {
				set(() => ({ customLines: [] }));
			},
			setOverlayVisibility: ({ overlayId, isVisible }) => {
				set((state) => ({
					overlays: {
						...state.overlays,
						[overlayId]: isVisible,
					},
				}));
			},
			toggleOverlayVisibility: ({ overlayId }) => {
				set((state) => ({
					overlays: {
						...state.overlays,
						[overlayId]: !state.overlays[overlayId],
					},
				}));
			},
		}),
		{
			name: "preview-settings",
			version: 6,
			migrate: (persistedState) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
				const state = persistedState as PersistedPreviewState | undefined;

				return {
					activeGuide: getPersistedActiveGuide(state),
					overlays: DEFAULT_PREVIEW_OVERLAYS,
					gridConfig: {
						rows: state?.gridConfig?.rows ?? DEFAULT_GRID_CONFIG.rows,
						cols: state?.gridConfig?.cols ?? DEFAULT_GRID_CONFIG.cols,
					},
					customLines: state?.customLines ?? [],
				};
			},
			partialize: (state) => ({
				activeGuide: state.activeGuide,
				overlays: state.overlays,
				gridConfig: state.gridConfig,
				customLines: state.customLines,
			}),
		},
	),
);
