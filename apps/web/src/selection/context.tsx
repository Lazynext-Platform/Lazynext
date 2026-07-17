/** @module Selection context provider and hook for sharing selection state across components */
"use client";

import { createContext, useContext } from "react";

interface SelectionContextValue {
	/** Currently selected item IDs. */
	selectedIds: string[];
	/** Anchor ID for shift-click range selection. */
	anchorId: string | null;
	/** Currently highlighted item ID. */
	highlightedId: string | null;
	/** Whether a box-select is in progress. */
	isBoxSelecting: boolean;
	/** Returns whether an item is selected. */
	isSelected: (id: string) => boolean;
	/** Clears all selections. */
	clearSelection: () => void;
	/** Handles item click with multi-select logic. */
	handleItemClick: ({
		event,
		id,
	}: {
		/** Mouse or keyboard event */
		event:
			| React.MouseEvent<HTMLDivElement>
			| React.KeyboardEvent<HTMLDivElement>;
		/** ID of the clicked item */
		id: string;
	}) => void;
	/** Handles item mouse-down for drag initiation. */
	handleItemMouseDown: ({
		event,
		id,
	}: {
		/** Mouse down event */
		event: React.MouseEvent<HTMLDivElement>;
		/** ID of the item */
		id: string;
	}) => void;
	/** Registers an item DOM element. */
	registerItem: (id: string, element: HTMLElement | null) => void;
}

/** React component rendering SelectionContext. */
export const SelectionContext = createContext<SelectionContextValue | null>(
	null,
);

/** Custom hook providing useSelectionContext functionality. */
export function useSelectionContext() {
	const context = useContext(SelectionContext);

	if (!context) {
		throw new Error(
			"useSelectionContext must be used within SelectableSurface",
		);
	}

	return context;
}

/** Custom hook providing useSelection functionality. */
export function useSelection() {
	const { selectedIds, anchorId, highlightedId, isSelected, clearSelection } =
		useSelectionContext();

	return {
		selectedIds,
		anchorId,
		highlightedId,
		isSelected,
		clearSelection,
	};
}
