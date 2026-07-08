/** @module Selection type definitions for selection state, box selection bounds, and hooks */
export interface SelectionState {
	/** Currently selected element IDs. */
	selectedIds: string[];
	/** Anchor (last-clicked) element ID. */
	anchorId: string | null;
}

export interface BoxSelectionSnapshot<TId = string> {
	/** Selected IDs at the start of the drag. */
	initialSelectedIds: TId[];
	/** Anchor ID at the start of the drag. */
	initialAnchorId: TId | null;
}

export interface SelectionBoxBounds {
	/** Left edge offset. */
	left: number;
	/** Top edge offset. */
	top: number;
	/** Box width. */
	width: number;
	/** Box height. */
	height: number;
}

export interface BoxSelectionChange<
	TId = string,
> extends BoxSelectionSnapshot<TId> {
	/** Intersected IDs at current drag position. */
	intersectedIds: TId[];
	/** Whether additive mode (Shift/Ctrl held). */
	isAdditive: boolean;
}

export type ResolveIntersections<TId = string> = ({
	startPos,
	currentPos,
}: {
	startPos: { x: number; y: number };
	currentPos: { x: number; y: number };
}) => TId[];

export interface SelectableSurfaceProps {
	/** Ordered list of selectable item IDs. */
	orderedIds: string[];
	/** Child React nodes. */
	children: React.ReactNode;
	/** Optional CSS class name. */
	className?: string;
	/** Accessible label for the surface. */
	ariaLabel?: string;
	/** ID of an item to scroll into view. */
	revealId?: string | null;
	/** Callback when reveal animation completes. */
	onRevealComplete?: () => void;
	/** Callback when selection state changes. */
	onSelectionChange?: (state: SelectionState) => void;
}

export interface SelectableItemProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Unique item identifier. */
	id: string;
	/** Child React nodes. */
	children: React.ReactNode;
}
