import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isGuideId, type GuideId } from "@/guides";
import { DEFAULT_GRID_CONFIG } from "@/guides/grid";
import type { GridConfig } from "@/guides/types";

type PreviewOverlaysState = Record<string, boolean>;

interface PersistedPreviewState {
	activeGuide?: string | null;
	layoutGuide?: {
		platform?: string | null;
	};
	overlays?: PreviewOverlaysState;
	gridConfig?: GridConfig;
	customLines?: Array<{ axis: "x" | "y"; percent: number }>;
}

interface PreviewState {
	activeGuide: GuideId | null;
	overlays: PreviewOverlaysState;
	gridConfig: GridConfig;
	customLines: Array<{ axis: "x" | "y"; percent: number }>;
	toggleGuide: (guideId: GuideId) => void;
	setGridConfig: (config: Partial<GridConfig>) => void;
	addCustomLine: (axis: "x" | "y", percent: number) => void;
	clearCustomLines: () => void;
	setOverlayVisibility: ({
		overlayId,
		isVisible,
	}: {
		overlayId: string;
		isVisible: boolean;
	}) => void;
	toggleOverlayVisibility: ({ overlayId }: { overlayId: string }) => void;
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
