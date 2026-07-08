/**
 * Seek-on-click controller — detects short clicks (not drags) on the
 * ruler or tracks area and seeks the playhead to that position with
 * frame snapping.
 *
 * @module timeline/controllers/seek-controller
 */

import type { MouseEvent as ReactMouseEvent } from "react";
import type { FrameRate } from "lazynext-wasm";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/timeline/scale";
import {
	mediaTime,
	snapSeekMediaTime,
	TICKS_PER_SECOND,
	type MediaTime,
} from "@/wasm";

type SeekSource = "ruler" | "tracks";

interface PendingSeekSession {
	/** Session state discriminant. */
	kind: "pending";
	/** Source of the seek (ruler or tracks). */
	source: SeekSource;
	/** Client X at pointer down. */
	downX: number;
	/** Client Y at pointer down. */
	downY: number;
	/** Timestamp at pointer down. */
	downTime: number;
}

type Session = { kind: "idle" } | PendingSeekSession;

/** Configuration for the seek controller. */
export interface SeekConfig {
	/** Current timeline zoom level. */
	zoomLevel: number;
	/** Total timeline duration in media ticks. */
	duration: MediaTime;
	/** Whether a box-select is active. */
	isSelecting: boolean;
	/** Returns the playhead DOM element. */
	getPlayheadEl: () => HTMLDivElement | null;
	/** Returns the track labels DOM element. */
	getTrackLabelsEl: () => HTMLDivElement | null;
	/** Returns the ruler scroll container. */
	getRulerScrollEl: () => HTMLDivElement | null;
	/** Returns the tracks scroll container. */
	getTracksScrollEl: () => HTMLDivElement | null;
	/** Returns the active project's frame rate. */
	getActiveProjectFps: () => FrameRate | null;
	/** Clears all selected elements. */
	clearSelectedElements: () => void;
	/** Seeks the playhead to the given time. */
	seek: (time: MediaTime) => void;
	/** Persists the current timeline view state. */
	setTimelineViewState: (viewState: {
		/** Current zoom level to persist. */
		zoomLevel: number;
		/** Current horizontal scroll offset. */
		scrollLeft: number;
		/** Current playhead time to persist. */
		playheadTime: MediaTime;
	}) => void;
}

/** Ref wrapper for seek config. */
export interface SeekConfigRef {
	/** Current seek configuration. */
	readonly current: SeekConfig;
}

function pixelToTime({
	clientX,
	scrollContainer,
	zoomLevel,
	duration,
}: {
	clientX: number;
	scrollContainer: HTMLDivElement;
	zoomLevel: number;
	duration: MediaTime;
}): MediaTime {
	const rect = scrollContainer.getBoundingClientRect();
	const mouseX = clientX - rect.left;
	const scrollLeft = scrollContainer.scrollLeft;

	const rawTimeSeconds = Math.max(
		0,
		Math.min(
			duration / TICKS_PER_SECOND,
			(mouseX + scrollLeft) / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel),
		),
	);

	return mediaTime({ ticks: Math.round(rawTimeSeconds * TICKS_PER_SECOND) });
}

function isClickGesture({
	event,
	session,
}: {
	event: ReactMouseEvent;
	session: PendingSeekSession;
}): boolean {
	const deltaX = Math.abs(event.clientX - session.downX);
	const deltaY = Math.abs(event.clientY - session.downY);
	const deltaTime = event.timeStamp - session.downTime;

	return deltaX <= 5 && deltaY <= 5 && deltaTime <= 500;
}

/**
 * Detects click-vs-drag gestures on the ruler/tracks and seeks the
 * playhead on click, clearing selection when appropriate.
 */
export class SeekController {
	private session: Session = { kind: "idle" };
	private readonly configRef: SeekConfigRef;

	constructor(deps: { configRef: SeekConfigRef }) {
		this.configRef = deps.configRef;
		this.onTracksMouseDown = this.onTracksMouseDown.bind(this);
		this.onRulerMouseDown = this.onRulerMouseDown.bind(this);
		this.onTracksClick = this.onTracksClick.bind(this);
		this.onRulerClick = this.onRulerClick.bind(this);
	}

	private get config(): SeekConfig {
		return this.configRef.current;
	}

	destroy(): void {
		this.session = { kind: "idle" };
	}

	onTracksMouseDown(event: ReactMouseEvent): void {
		this.beginPendingSeek({ event, source: "tracks" });
	}

	onRulerMouseDown(event: ReactMouseEvent): void {
		this.beginPendingSeek({ event, source: "ruler" });
	}

	onTracksClick(event: ReactMouseEvent): void {
		this.handleClick({ event, source: "tracks" });
	}

	onRulerClick(event: ReactMouseEvent): void {
		this.handleClick({ event, source: "ruler" });
	}

	private beginPendingSeek({
		event,
		source,
	}: {
		event: ReactMouseEvent;
		source: SeekSource;
	}): void {
		if (event.button !== 0) return;

		this.session = {
			kind: "pending",
			source,
			downX: event.clientX,
			downY: event.clientY,
			downTime: event.timeStamp,
		};
	}

	private handleClick({
		event,
		source,
	}: {
		event: ReactMouseEvent;
		source: SeekSource;
	}): void {
		const shouldProcess = this.shouldProcessClick({ event, source });
		this.session = { kind: "idle" };

		if (!shouldProcess) return;

		this.config.clearSelectedElements();
		this.seekFromEvent({ event, source });
	}

	private shouldProcessClick({
		event,
		source,
	}: {
		event: ReactMouseEvent;
		source: SeekSource;
	}): boolean {
		if (this.session.kind !== "pending") return false;
		if (this.session.source !== source) return false;
		if (!isClickGesture({ event, session: this.session })) return false;
		if (this.config.isSelecting) return false;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
		const target = event.target as HTMLElement;
		if (this.config.getPlayheadEl()?.contains(target)) return false;

		if (this.config.getTrackLabelsEl()?.contains(target)) {
			this.config.clearSelectedElements();
			return false;
		}

		return true;
	}

	private seekFromEvent({
		event,
		source,
	}: {
		event: ReactMouseEvent;
		source: SeekSource;
	}): void {
		const scrollContainer =
			source === "ruler"
				? this.config.getRulerScrollEl()
				: this.config.getTracksScrollEl();
		if (!scrollContainer) return;

		const rawTime = pixelToTime({
			clientX: event.clientX,
			scrollContainer,
			zoomLevel: this.config.zoomLevel,
			duration: this.config.duration,
		});

		const fps = this.config.getActiveProjectFps();
		const time =
			fps != null
				? snapSeekMediaTime({
						time: rawTime,
						duration: this.config.duration,
						fps,
					})
				: rawTime;

		this.config.seek(time);
		this.config.setTimelineViewState({
			zoomLevel: this.config.zoomLevel,
			scrollLeft: scrollContainer.scrollLeft,
			playheadTime: time,
		});
	}
}
