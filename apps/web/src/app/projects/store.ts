/**
 * Projects Zustand store — persisted client state for the projects
 * browser: search query, sort key/order, view mode (grid vs list),
 * and multi-select / shift-click range selection.
 *
 * View mode and sort preferences are persisted to localStorage via
 * Zustand's `persist` middleware (key: `"projects-view-mode"`).
 *
 * @module projects/store
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TProjectSortKey } from "@/project/types";

export type ProjectsViewMode = "grid" | "list";

interface ProjectsState {
	/** Current search query. */
	searchQuery: string;
	/** Active sort key. */
	sortKey: TProjectSortKey;
	/** Sort direction. */
	sortOrder: "asc" | "desc";
	/** Active view mode (grid or list). */
	viewMode: ProjectsViewMode;
	/** Currently selected project IDs. */
	selectedProjectIds: string[];
	/** Last selected project ID for shift-click range. */
	lastSelectedProjectId: string | null;
	/** Whether persisted state has been rehydrated. */
	isHydrated: boolean;
	/** Marks the store as hydrated. */
	setIsHydrated: ({ isHydrated }: {
		/** Whether persisted state has been rehydrated. */
		isHydrated: boolean;
	}) => void;
	/** Sets the search query. */
	setSearchQuery: ({ query }: {
		/** New search query string. */
		query: string;
	}) => void;
	/** Sets the sort key. */
	setSortKey: ({ sortKey }: {
		/** Sort key to apply. */
		sortKey: TProjectSortKey;
	}) => void;
	/** Sets the sort order. */
	setSortOrder: ({ sortOrder }: {
		/** Sort direction (ascending or descending). */
		sortOrder: "asc" | "desc";
	}) => void;
	/** Toggles sort order between asc and desc. */
	toggleSortOrder: () => void;
	/** Sets the view mode. */
	setViewMode: ({ viewMode }: {
		/** View mode to apply (grid or list). */
		viewMode: ProjectsViewMode;
	}) => void;
	/** Replaces the selected project IDs. */
	setSelectedProjects: ({ projectIds }: {
		/** Project IDs to select. */
		projectIds: string[];
	}) => void;
	/** Clears all selected projects. */
	clearSelectedProjects: () => void;
	/** Adds or removes a project from the selection. */
	setProjectSelected: ({
		projectId,
		isSelected,
	}: {
		/** Project ID to toggle. */
		projectId: string;
		/** Whether the project should be selected. */
		isSelected: boolean;
	}) => void;
	/** Shift-click range selection of projects. */
	selectProjectRange: ({
		projectId,
		allProjectIds,
	}: {
		/** Project ID at the end of the range. */
		projectId: string;
		/** All project IDs for range calculation. */
		allProjectIds: string[];
	}) => void;
}

const getNextSelectedProjectIds = ({
	selectedProjectIds,
	projectId,
	isSelected,
}: {
	selectedProjectIds: string[];
	projectId: string;
	isSelected: boolean;
}): string[] => {
	const selectedProjectIdSet = new Set(selectedProjectIds);

	if (isSelected) {
		selectedProjectIdSet.add(projectId);
		return Array.from(selectedProjectIdSet);
	}

	selectedProjectIdSet.delete(projectId);
	return Array.from(selectedProjectIdSet);
};

export const useProjectsStore = create<ProjectsState>()(
	persist(
		(set) => ({
			searchQuery: "",
			sortKey: "updatedAt",
			sortOrder: "desc",
			viewMode: "grid",
			selectedProjectIds: [],
			lastSelectedProjectId: null,
			isHydrated: false,
			setIsHydrated: ({ isHydrated }) => set({ isHydrated }),
			setSearchQuery: ({ query }) => set({ searchQuery: query }),
			setSortKey: ({ sortKey }) => set({ sortKey }),
			setSortOrder: ({ sortOrder }) => set({ sortOrder }),
			toggleSortOrder: () =>
				set((state) => ({
					sortOrder: state.sortOrder === "asc" ? "desc" : "asc",
				})),
			setViewMode: ({ viewMode }) => set({ viewMode }),
			setSelectedProjects: ({ projectIds }) =>
				set({ selectedProjectIds: projectIds }),
			clearSelectedProjects: () =>
				set({ selectedProjectIds: [], lastSelectedProjectId: null }),
			setProjectSelected: ({ projectId, isSelected }) =>
				set((state) => ({
					selectedProjectIds: getNextSelectedProjectIds({
						selectedProjectIds: state.selectedProjectIds,
						projectId,
						isSelected,
					}),
					lastSelectedProjectId: isSelected
						? projectId
						: state.lastSelectedProjectId,
				})),
			selectProjectRange: ({ projectId, allProjectIds }) =>
				set((state) => {
					const anchorId = state.lastSelectedProjectId;
					if (!anchorId) {
						return {
							selectedProjectIds: [projectId],
							lastSelectedProjectId: projectId,
						};
					}

					const anchorIndex = allProjectIds.indexOf(anchorId);
					const targetIndex = allProjectIds.indexOf(projectId);

					if (anchorIndex === -1 || targetIndex === -1) {
						return {
							selectedProjectIds: [projectId],
							lastSelectedProjectId: projectId,
						};
					}

					const startIndex = Math.min(anchorIndex, targetIndex);
					const endIndex = Math.max(anchorIndex, targetIndex);
					const rangeIds = allProjectIds.slice(startIndex, endIndex + 1);

					const merged = new Set([...state.selectedProjectIds, ...rangeIds]);
					return {
						selectedProjectIds: Array.from(merged),
					};
				}),
		}),
		{
			name: "projects-view-mode",
			partialize: (state) => ({
				viewMode: state.viewMode,
				sortKey: state.sortKey,
				sortOrder: state.sortOrder,
			}),
			onRehydrateStorage: () => (state) => {
				state?.setIsHydrated({ isHydrated: true });
			},
		},
	),
);
