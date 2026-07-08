/**
 * Renders a single track row with its elements, drag-drop zone, and
 * background click handler for selection/deselection.
 *
 * @module timeline/components/timeline-track
 */

"use client";

import { useElementSelection } from "@/timeline/hooks/element/use-element-selection";
import { TimelineElement } from "./timeline-element";
import type { TimelineTrack } from "@/timeline";
import type { TimelineElement as TimelineElementType } from "@/timeline";
import { TIMELINE_LAYERS } from "./layers";
import type { ElementDragView } from "@/timeline";

interface TimelineTrackContentProps {
	/** The track to render. */
	track: TimelineTrack;
	/** Current timeline zoom level. */
	zoomLevel: number;
	/** Current drag view state. */
	dragView: ElementDragView;
	/** Callback when a resize handle drag begins. */
	onResizeStart: (params: {
		/** Mouse event that initiated the resize */
		event: React.MouseEvent;
		/** Element being resized */
		element: TimelineElementType;
		/** Track owning the element */
		track: TimelineTrack;
		/** Side being dragged (left or right handle) */
		side: "left" | "right";
	}) => void;
	/** Callback when an element receives mouse down. */
	onElementMouseDown: (params: {
		/** Mouse event for the press */
		event: React.MouseEvent;
		/** Element receiving the mouse down */
		element: TimelineElementType;
		/** Track owning the element */
		track: TimelineTrack;
	}) => void;
	/** Callback when an element is clicked. */
	onElementClick: (params: {
		/** Mouse event for the click */
		event: React.MouseEvent;
		/** Element that was clicked */
		element: TimelineElementType;
		/** Track owning the element */
		track: TimelineTrack;
	}) => void;
	/** Callback when the track background receives mouse down. */
	onTrackMouseDown?: (event: React.MouseEvent) => void;
	/** Callback when the track background receives mouse up. */
	onTrackMouseUp?: (event: React.MouseEvent) => void;
	/** Returns whether the current click should be ignored. */
	shouldIgnoreClick?: () => boolean;
	/** Identifier of the current drop-target element, if any. */
	targetElementId?: string | null;
}

/**
 * Renders a track row: empty-state dashed border or element clips,
 * plus a transparent button overlay for track-level click selection.
 */
export function TimelineTrackContent({
	track,
	zoomLevel,
	dragView,
	onResizeStart,
	onElementMouseDown,
	onElementClick,
	onTrackMouseDown,
	onTrackMouseUp,
	shouldIgnoreClick,
	targetElementId = null,
}: TimelineTrackContentProps) {
	const { isElementSelected } = useElementSelection();

	return (
		<div className="relative size-full">
			<button
				type="button"
				className="absolute inset-0 m-0 size-full appearance-none border-0 bg-transparent p-0"
				aria-label={`Select ${track.name} track`}
				onMouseUp={(event) => {
					if (shouldIgnoreClick?.()) return;
					onTrackMouseUp?.(event);
				}}
				onMouseDown={(event) => {
					event.preventDefault();
					onTrackMouseDown?.(event);
				}}
			/>
			{/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- spatial gesture surface; the wrapping <button> handles keyboard track selection, this <div> only forwards background clicks for box-select / deselect. */}
			<div
				className="relative h-full min-w-full"
				style={{ zIndex: TIMELINE_LAYERS.trackContent }}
				onMouseUp={(event) => {
					if (event.target !== event.currentTarget) return;
					if (shouldIgnoreClick?.()) return;
					onTrackMouseUp?.(event);
				}}
				onMouseDown={(event) => {
					if (event.target !== event.currentTarget) return;
					event.preventDefault();
					onTrackMouseDown?.(event);
				}}
			>
				{track.elements.length === 0 ? (
					<div className="text-muted-foreground border-muted/30 pointer-events-none flex size-full items-center justify-center rounded-sm border-2 border-dashed text-xs" />
				) : (
					track.elements.map((element) => {
						const isSelected = isElementSelected({
							trackId: track.id,
							elementId: element.id,
						});

						return (
							<TimelineElement
								key={element.id}
								element={element}
								track={track}
								zoomLevel={zoomLevel}
								isSelected={isSelected}
								onResizeStart={({ event, element, side }) =>
									onResizeStart({ event, element, track, side })
								}
								onElementMouseDown={({ event, element }) =>
									onElementMouseDown({ event, element, track })
								}
								onElementClick={({ event, element }) =>
									onElementClick({ event, element, track })
								}
								dragView={dragView}
								isDropTarget={element.id === targetElementId}
							/>
						);
					})
				)}
			</div>
		</div>
	);
}
