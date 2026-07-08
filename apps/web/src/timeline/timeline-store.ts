/**
 * Lightweight Zustand store for timeline UI preferences — snapping,
 * ripple editing, and expanded element state.
 *
 * Persisted to localStorage under the key `"timeline-store"`.
 *
 * For core state logic, use {@link EditorCore} instead.
 *
 * @module timeline/timeline-store
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimelineStore {
	/** Whether snapping is enabled. */
	snappingEnabled: boolean;
	/** Toggles the snapping preference. */
	toggleSnapping: () => void;
	/** Whether ripple editing is enabled. */
	rippleEditingEnabled: boolean;
	/** Toggles the ripple editing preference. */
	toggleRippleEditing: () => void;
	/** IDs of elements currently expanded in the timeline. */
	expandedElementIds: Set<string>;
	/** Toggles the expanded state of an element. */
	toggleElementExpanded: (elementId: string) => void;
}

/**
 * Hook to read/write timeline UI preferences.
 */
export const useTimelineStore = create<TimelineStore>()(
	persist(
		(set) => ({
			snappingEnabled: true,

			toggleSnapping: () => {
				set((state) => ({ snappingEnabled: !state.snappingEnabled }));
			},

			rippleEditingEnabled: false,

			toggleRippleEditing: () => {
				set((state) => ({
					rippleEditingEnabled: !state.rippleEditingEnabled,
				}));
			},

			expandedElementIds: new Set<string>(),

			toggleElementExpanded: (elementId) => {
				set((state) => {
					const next = new Set(state.expandedElementIds);
					if (next.has(elementId)) {
						next.delete(elementId);
					} else {
						next.add(elementId);
					}
					return { expandedElementIds: next };
				});
			},
		}),
		{
			name: "timeline-store",
			partialize: (state) => ({
				snappingEnabled: state.snappingEnabled,
				rippleEditingEnabled: state.rippleEditingEnabled,
			}),
		},
	),
);
