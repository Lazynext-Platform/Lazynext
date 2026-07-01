/**
 * Live drag session state holder for timeline drag-and-drop.
 *
 * Browsers restrict `DataTransfer.getData()` to the `drop` event; this
 * singleton keeps the payload accessible during `dragover`/`dragenter`
 * so drop targets can inspect element type and duration while hovering.
 *
 * @module timeline/drag-source
 */

import type { TimelineDragData } from "@/timeline/drag";

const TIMELINE_DRAG_MIME = "application/x-timeline-drag";

/**
 * Owns the state of an in-progress timeline drag session.
 *
 * Exists because browsers restrict `DataTransfer.getData()` to the `drop`
 * event for security — during `dragover`/`dragenter` only `types` is
 * readable. The drop target needs the payload (element type, target
 * element types, source duration) while the pointer is hovering, so we
 * keep a live copy here and hand it out via {@link getActive}.
 */
export class TimelineDragSource {
	private active: TimelineDragData | null = null;

	/**
	 * Starts a drag session, stashing the payload on the native
	 * DataTransfer and in the in-memory active slot.
	 */
	begin({
		dataTransfer,
		dragData,
	}: {
		dataTransfer: DataTransfer;
		dragData: TimelineDragData;
	}): void {
		dataTransfer.setData(TIMELINE_DRAG_MIME, JSON.stringify(dragData));
		dataTransfer.effectAllowed = "copy";
		this.active = dragData;
	}

	/** Clears the in-progress drag payload. */
	end(): void {
		this.active = null;
	}

	/** Returns the currently active drag payload, or null if idle. */
	getActive(): TimelineDragData | null {
		return this.active;
	}

	/** Returns `true` when a drag session is in progress. */
	isActive(): boolean {
		return this.active !== null;
	}
}
