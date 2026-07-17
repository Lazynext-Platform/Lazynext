/**
 * Editor-level timeline wrapper — integrates the full timeline component
 * with the editor state and project context.
 *
 * @module components/editor/timeline
 */
/* eslint-disable react-hooks/exhaustive-deps */
import {
	useState,
	useEffect,
	useRef,
	type MouseEvent as ReactMouseEvent,
	type DragEvent,
} from "react";
import { motion } from "framer-motion";
import AudioWaveform from "./AudioWaveform";

interface TimelineProps {
	/** Project data object. */
	project: any;
	/** Current playhead frame index. */
	frame: number;
	/** Called when the playhead moves to a new frame. */
	onChangeFrame: (f: number) => void;
	/** Called for intermediate project state updates (live preview). */
	onProjectUpdate: (p: any) => void;
	/** Called to commit a final project state change. */
	onCommitUpdate: (p: any) => void;
	/** Currently selected clip ID (single select). */
	selectedClipId: string | null;
	/** Set of selected clip IDs (multi-select). */
	selectedClipIds?: string[];
	/** Callback to split a clip at a frame. */
	onSplitClip?: (clipId: string, frame: number) => void;
	/** Callback for trim operations on a clip. */
	onTrimClip?: (clipId: string, newStart: number, newDuration: number) => void;
	/** Select a single clip by ID. */
	onSelectClip?: (id: string | null) => void;
	/** Toggle a clip in the multi-select set. */
	onToggleSelectClip?: (id: string) => void;
	/** Add a new track to the timeline. */
	onAddTrack?: () => void;
	/** Add a marker at the given frame. */
	onAddMarker?: (frame: number, color: string, label: string) => void;
	/** Update an existing marker. */
	onUpdateMarker?: (id: string, updates: Partial<any>) => void;
	/** Delete a marker by ID. */
	onDeleteMarker?: (id: string) => void;
	/** Rename a track at the given index. */
	onRenameTrack?: (trackIdx: number, newName: string) => void;
	/** Move a clip to a different track and start frame. */
	onMoveClip?: (
		/** ID of the clip to move. */
		clipId: string,
		/** Target track ID to move the clip to. */
		targetTrackId: string,
		/** New start frame position. */
		startFrame: number,
	) => void;
	/** Pixels per frame (zoom level). */
	pxPerFrame?: number;
	/** Toggle track lock state. */
	onToggleTrackLock?: (idx: number) => void;
	/** Toggle track visibility. */
	onToggleTrackHide?: (idx: number) => void;
	/** Toggle track mute. */
	onToggleTrackMute?: (idx: number) => void;
	/** Toggle track solo. */
	onToggleTrackSolo?: (idx: number) => void;
	/** Available media assets for thumbnails and waveforms. */
	assets?: any[];
	/** Whether snap-to-grid is active. */
	isSnappingEnabled?: boolean;
	/** Reorder a track from one index to another. */
	onMoveTrack?: (fromIdx: number, toIdx: number) => void;
	/** Whether the timeline is currently playing. */
	isPlaying?: boolean;
	/** Timeline marker positions. */
	markers?: { frame: number; label: string; color?: string }[];
	/** Cloud-synced review comments. */
	cloudComments?: {
		/** Frame position of the comment. */
		frame: number;
		/** Comment text content. */
		text: string;
		/** Name of the comment author. */
		author: string;
		/** URL to the author's avatar image. */
		avatar: string;
		/** Unix timestamp when the comment was created. */
		timestamp: number;
	}[];
	/** Context menu handler for clips. */
	onContextMenuClip?: (e: React.MouseEvent, clipId: string) => void;
	/** Context menu handler for tracks. */
	onContextMenuTrack?: (e: React.MouseEvent, trackIdx: number) => void;
	/** Currently active editing tool. */
	activeTool?: "select" | "razor" | "slip" | "ripple" | "slide" | "roll";
	/** Click handler for clips (used by razor tool). */
	onClickClip?: (
		/** React mouse event from the click. */
		e: React.MouseEvent,
		/** ID of the clip that was clicked. */
		clipId: string,
		/** Frame index at the click position, relative to the clip. */
		frameAtClick?: number,
	) => void;
	/** Track row height preset. */
	trackHeight?: "sm" | "md" | "lg";
	/** Whether quantum superposition visual effect is active. */
	isQuantumSuperposition?: boolean;
}

/** React component rendering Timeline. */
export default function Timeline({
	project,
	frame,
	onChangeFrame,
	onProjectUpdate,
	onCommitUpdate,
	selectedClipId,
	selectedClipIds = [],
	onSelectClip,
	onToggleSelectClip,
	onMoveClip: _onMoveClip,
	onTrimClip: _onTrimClip,
	onAddTrack: _onAddTrack,
	onAddMarker: _onAddMarker,
	onUpdateMarker: _onUpdateMarker,
	onDeleteMarker: _onDeleteMarker,
	pxPerFrame = 10,
	onToggleTrackLock,
	onToggleTrackHide,
	onToggleTrackMute,
	onToggleTrackSolo,
	assets = [],
	isSnappingEnabled = true,
	onMoveTrack,
	isPlaying = false,
	onRenameTrack,
	markers = [],
	cloudComments = [],
	onContextMenuClip,
	onContextMenuTrack,
	activeTool = "select",
	onClickClip,
	trackHeight = "md",
	isQuantumSuperposition = false,
}: TimelineProps) {
	const playheadX = frame * pxPerFrame;
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const [scrollLeft, setScrollLeft] = useState(0);
	const [clientWidth, setClientWidth] = useState(1000);

	useEffect(() => {
		const el = scrollContainerRef.current;
		if (!el) return;
		const handleScroll = () => {
			setScrollLeft(el.scrollLeft);
			setClientWidth(el.clientWidth);
		};
		el.addEventListener("scroll", handleScroll);

		// Initial size
		const resizeObserver = new ResizeObserver(() => handleScroll());
		resizeObserver.observe(el);
		handleScroll();

		return () => {
			el.removeEventListener("scroll", handleScroll);
			resizeObserver.disconnect();
		};
	}, []);

	const [draggingPlayhead, setDraggingPlayhead] = useState(false);
	const [isDraggingMinimap, setIsDraggingMinimap] = useState(false);

	// Auto-scroll the timeline to follow the playhead during playback
	useEffect(() => {
		if (!isPlaying || !scrollContainerRef.current) return;
		const container = scrollContainerRef.current;
		const playheadPos = playheadX + 128; // offset for track header width
		const viewportLeft = container.scrollLeft;
		const viewportRight = viewportLeft + container.clientWidth;
		const margin = 100; // pixels of padding before edge

		if (playheadPos > viewportRight - margin) {
			container.scrollLeft = playheadPos - container.clientWidth + margin;
		} else if (playheadPos < viewportLeft + margin) {
			container.scrollLeft = Math.max(0, playheadPos - margin);
		}
	}, [frame, isPlaying, playheadX]);

	const [trimmingState, setTrimmingState] = useState<{
		trackIdx: number;
		clipId: string;
		edge: "left" | "right";
		initialX: number;
		initialStart: number;
		initialDuration: number;
		initialMediaOffset: number;
	} | null>(null);

	const [slippingState, setSlippingState] = useState<{
		trackIdx: number;
		clipId: string;
		initialX: number;
		initialMediaOffset: number;
	} | null>(null);

	const [slidingState, setSlidingState] = useState<{
		trackIdx: number;
		clipId: string;
		initialX: number;
		initialStart: number;
		prevClipId: string | null;
		prevInitialDuration: number;
		nextClipId: string | null;
		nextInitialStart: number;
		nextInitialDuration: number;
		nextInitialMediaOffset: number;
	} | null>(null);

	useEffect(() => {
		if (
			!trimmingState &&
			!slippingState &&
			!slidingState &&
			!isDraggingMinimap &&
			!draggingPlayhead
		)
			return;

		const handleGlobalMouseMove = (e: MouseEvent) => {
			if (isDraggingMinimap && scrollContainerRef.current) {
				const totalContentWidth =
					(project.duration_frames || 300) * pxPerFrame + 128;
				const minimapViewWidth = Math.max(1, clientWidth - 128);
				const minimapRatio =
					totalContentWidth > 0 ? minimapViewWidth / totalContentWidth : 1;

				const rect = scrollContainerRef.current.getBoundingClientRect();
				const minimapX = e.clientX - rect.left - 128;
				const targetScrollLeft = minimapX / minimapRatio - clientWidth / 2;
				scrollContainerRef.current.scrollLeft = Math.max(0, targetScrollLeft);
				return;
			}

			if (trimmingState) {
				const deltaX = e.clientX - trimmingState.initialX;
				const deltaFrames = Math.round(deltaX / pxPerFrame);

				const newProject = JSON.parse(JSON.stringify(project));
				const track = newProject.tracks[trimmingState.trackIdx];
				if (!track) return;
				const clip = track.clips.find(
					(c: any) => c.id === trimmingState.clipId,
				);
				if (!clip) return;

				const snapThreshold = Math.max(2, Math.round(15 / pxPerFrame));
				const getSnapTargets = () => {
					const targets = [0, frame];
					markers?.forEach((m) => targets.push(m.frame));
					project.tracks?.forEach((t: any) =>
						t.clips?.forEach((c: any) => {
							if (c.id !== clip.id) {
								targets.push(c.start_frame || 0);
								targets.push((c.start_frame || 0) + (c.duration_frames || 100));
								c.markers?.forEach((m: any) =>
									targets.push((c.start_frame || 0) + m.frame),
								);
								c.keyframes?.forEach((k: any) =>
									targets.push((c.start_frame || 0) + k.frame),
								);
							}
						}),
					);
					return targets;
				};

				const snap = (target: number) => {
					if (!isSnappingEnabled) return target;
					const targets = getSnapTargets();
					let closest = target;
					let minDiff = snapThreshold + 1;
					targets.forEach((t) => {
						const diff = Math.abs(t - target);
						if (diff < minDiff && diff <= snapThreshold) {
							minDiff = diff;
							closest = t;
						}
					});
					return closest;
				};

				if (trimmingState.edge === "left") {
					let newStart = trimmingState.initialStart + deltaFrames;
					newStart = snap(newStart);
					newStart = Math.max(0, newStart);
					const maxStart =
						trimmingState.initialStart + trimmingState.initialDuration - 1;
					newStart = Math.min(newStart, maxStart);

					const shift = newStart - trimmingState.initialStart;
					clip.start_frame = newStart;
					clip.duration_frames = trimmingState.initialDuration - shift;
					if (clip.type === "video" || clip.type === "audio") {
						clip.media_offset_frames = Math.max(
							0,
							trimmingState.initialMediaOffset + shift,
						);
					}

					if (activeTool === "ripple") {
						clip.start_frame = trimmingState.initialStart; // Anchor the left edge
						const oldEnd =
							trimmingState.initialStart + trimmingState.initialDuration;
						for (let i = 0; i < track.clips.length; i++) {
							const c = track.clips[i];
							if (c.id !== clip.id && c.start_frame >= oldEnd) {
								c.start_frame -= shift;
							}
						}
					} else if (activeTool === "roll") {
						if (shift !== 0) {
							let prevClip = null;
							for (let i = 0; i < track.clips.length; i++) {
								const c = track.clips[i];
								if (
									c.id !== clip.id &&
									c.start_frame + c.duration_frames <=
										trimmingState.initialStart
								) {
									if (
										!prevClip ||
										c.start_frame + c.duration_frames >
											prevClip.start_frame + prevClip.duration_frames
									) {
										prevClip = c;
									}
								}
							}
							if (prevClip) {
								prevClip.duration_frames += shift;
							}
						}
					}
				} else {
					let newEnd =
						trimmingState.initialStart +
						trimmingState.initialDuration +
						deltaFrames;
					newEnd = snap(newEnd);
					const minEnd = trimmingState.initialStart + 1;
					newEnd = Math.max(minEnd, newEnd); // Use Math.max instead of min to prevent negative duration

					clip.duration_frames = newEnd - clip.start_frame;

					if (activeTool === "ripple") {
						const oldEnd =
							trimmingState.initialStart + trimmingState.initialDuration;
						const deltaEnd = newEnd - oldEnd;
						if (deltaEnd !== 0) {
							for (let i = 0; i < track.clips.length; i++) {
								const c = track.clips[i];
								if (c.id !== clip.id && c.start_frame >= oldEnd) {
									c.start_frame += deltaEnd;
								}
							}
						}
					} else if (activeTool === "roll") {
						const oldEnd =
							trimmingState.initialStart + trimmingState.initialDuration;
						const deltaEnd = newEnd - oldEnd;
						if (deltaEnd !== 0) {
							let nextClip = null;
							for (let i = 0; i < track.clips.length; i++) {
								const c = track.clips[i];
								if (c.id !== clip.id && c.start_frame >= oldEnd) {
									if (!nextClip || c.start_frame < nextClip.start_frame) {
										nextClip = c;
									}
								}
							}
							if (nextClip) {
								nextClip.start_frame += deltaEnd;
								nextClip.duration_frames -= deltaEnd;
								if (nextClip.type === "video" || nextClip.type === "audio") {
									nextClip.media_offset_frames = Math.max(
										0,
										(nextClip.media_offset_frames || 0) + deltaEnd,
									);
								}
							}
						}
					}
				}

				onProjectUpdate(newProject);
			} else if (slippingState) {
				const deltaX = e.clientX - slippingState.initialX;
				const deltaFrames = Math.round(deltaX / pxPerFrame);

				const newProject = JSON.parse(JSON.stringify(project));
				const track = newProject.tracks[slippingState.trackIdx];
				if (!track) return;
				const clip = track.clips.find(
					(c: any) => c.id === slippingState.clipId,
				);
				if (!clip) return;

				const newMediaOffset = Math.max(
					0,
					slippingState.initialMediaOffset - deltaFrames,
				);
				clip.media_offset_frames = newMediaOffset;
				onProjectUpdate(newProject);
			} else if (slidingState) {
				const deltaX = e.clientX - slidingState.initialX;
				const deltaFrames = Math.round(deltaX / pxPerFrame);

				const newProject = JSON.parse(JSON.stringify(project));
				const track = newProject.tracks[slidingState.trackIdx];
				if (!track) return;
				const clip = track.clips.find((c: any) => c.id === slidingState.clipId);
				if (!clip) return;

				const newStart = Math.max(0, slidingState.initialStart + deltaFrames);
				const actualDelta = newStart - slidingState.initialStart;
				clip.start_frame = newStart;

				if (slidingState.prevClipId) {
					const prevClip = track.clips.find(
						(c: any) => c.id === slidingState.prevClipId,
					);
					if (prevClip) {
						prevClip.duration_frames = Math.max(
							1,
							slidingState.prevInitialDuration + actualDelta,
						);
					}
				}

				if (slidingState.nextClipId) {
					const nextClip = track.clips.find(
						(c: any) => c.id === slidingState.nextClipId,
					);
					if (nextClip) {
						nextClip.start_frame = slidingState.nextInitialStart + actualDelta;
						nextClip.duration_frames = Math.max(
							1,
							slidingState.nextInitialDuration - actualDelta,
						);
						if (nextClip.type === "video" || nextClip.type === "audio") {
							nextClip.media_offset_frames = Math.max(
								0,
								slidingState.nextInitialMediaOffset + actualDelta,
							);
						}
					}
				}
				onProjectUpdate(newProject);
			}
		};

		const handleGlobalMouseUp = () => {
			setSlippingState(null);
			setSlidingState(null);
			setIsDraggingMinimap(false);

			if (trimmingState) {
				onCommitUpdate(project);
				setTrimmingState(null);
			}
			if (draggingPlayhead) {
				setDraggingPlayhead(false);
			}
		};

		window.addEventListener("mousemove", handleGlobalMouseMove);
		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleGlobalMouseMove);
			window.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [
		trimmingState,
		draggingPlayhead,
		slippingState,
		slidingState,
		isDraggingMinimap,
		pxPerFrame,
		scrollLeft,
		clientWidth,
		project,
		onChangeFrame,
		onProjectUpdate,
		onCommitUpdate,
		isSnappingEnabled,
		frame,
	]);

	const handleTimelineClick = (e: ReactMouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
		const newFrame = Math.max(0, Math.floor(x / pxPerFrame));
		onChangeFrame(Math.min((project.duration_frames || 100) - 1, newFrame));
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>, trackIdx: number) => {
		e.preventDefault();
		const payloadJson = e.dataTransfer.getData("application/json");
		if (!payloadJson) return;
		if (project.tracks[trackIdx]?.isLocked) return;

		try {
			const payload = JSON.parse(payloadJson);
			const newProject = JSON.parse(JSON.stringify(project));

			const rect = e.currentTarget.getBoundingClientRect();
			let dropX = e.clientX - rect.left + e.currentTarget.scrollLeft;

			const snapThreshold = Math.max(2, Math.round(15 / pxPerFrame));
			const snap = (targetFrame: number, ignoreId?: string) => {
				if (!isSnappingEnabled) return targetFrame;
				const targets = [0, frame];
				markers?.forEach((m) => targets.push(m.frame));
				newProject.tracks?.forEach((t: any) =>
					t.clips?.forEach((c: any) => {
						if (c.id !== ignoreId) {
							targets.push(c.start_frame || 0);
							targets.push((c.start_frame || 0) + (c.duration_frames || 100));
							c.markers?.forEach((m: any) =>
								targets.push((c.start_frame || 0) + m.frame),
							);
							c.keyframes?.forEach((k: any) =>
								targets.push((c.start_frame || 0) + k.frame),
							);
						}
					}),
				);
				let closest = targetFrame;
				let minDiff = snapThreshold + 1;
				targets.forEach((t) => {
					const diff = Math.abs(t - targetFrame);
					if (diff < minDiff && diff <= snapThreshold) {
						minDiff = diff;
						closest = t;
					}
				});
				return closest;
			};

			let newClip: any;
			if (payload.type === "existing_clip") {
				dropX -= payload.offsetX;
				const rawStartFrame = Math.max(0, Math.floor(dropX / pxPerFrame));
				const startFrame = snap(rawStartFrame, payload.clipId);

				const sourceTrack = newProject.tracks[payload.sourceTrackIdx];
				if (!sourceTrack || !sourceTrack.clips) return;

				const clipIndex = sourceTrack.clips.findIndex(
					(c: any) => c.id === payload.clipId,
				);
				if (clipIndex === -1) return;

				const originalClip = sourceTrack.clips[clipIndex];
				const frameDelta = startFrame - (originalClip.start_frame || 0);
				const trackDelta = trackIdx - payload.sourceTrackIdx;

				const idsToMove = selectedClipIds.includes(payload.clipId)
					? selectedClipIds
					: [payload.clipId];

				const clipsToMove: { clip: any; newTrackIdx: number }[] = [];
				for (let t = 0; t < newProject.tracks.length; t++) {
					const tClips = newProject.tracks[t].clips;
					for (let c = tClips.length - 1; c >= 0; c--) {
						if (idsToMove.includes(tClips[c].id)) {
							const [extracted] = tClips.splice(c, 1);
							extracted.start_frame = Math.max(
								0,
								(extracted.start_frame || 0) + frameDelta,
							);
							const targetTIdx = Math.max(
								0,
								Math.min(newProject.tracks.length - 1, t + trackDelta),
							);
							clipsToMove.push({ clip: extracted, newTrackIdx: targetTIdx });
						}
					}
				}

				clipsToMove.forEach(({ clip, newTrackIdx }) => {
					if (!newProject.tracks[newTrackIdx].isLocked) {
						newProject.tracks[newTrackIdx].clips.push(clip);
					} else {
						// If target is locked, just put it back where it came from but shifted in time
						const _origTrackIdx =
							newProject.tracks.findIndex((tr: any) =>
								tr.clips.some((c: any) => c.id === clip.id),
							) || 0; // fallback if lost
						// actually it was extracted, so we need to fallback to its source track (t - trackDelta)
						const fallbackTIdx = Math.max(
							0,
							Math.min(newProject.tracks.length - 1, newTrackIdx - trackDelta),
						);
						newProject.tracks[fallbackTIdx].clips.push(clip);
					}

					const clipEnd = clip.start_frame + (clip.duration_frames || 100);
					if (clipEnd > (newProject.duration_frames || 0)) {
						newProject.duration_frames = clipEnd + 60;
					}
				});

				onProjectUpdate(newProject);
				onCommitUpdate(newProject);
				if (idsToMove.length === 1) onSelectClip?.(payload.clipId);
			} else if (payload.type === "preset") {
				if (payload.isEffect) {
					const dropFrame = Math.max(0, Math.floor(dropX / pxPerFrame));
					const targetClip = newProject.tracks[trackIdx].clips.find(
						(c: any) =>
							dropFrame >= (c.start_frame || 0) &&
							dropFrame <= (c.start_frame || 0) + (c.duration_frames || 100),
					);
					if (targetClip) {
						if (payload.preset.effectType === "pixelate")
							targetClip.pixelate = 20;
						if (payload.preset.effectType === "edge_detect")
							targetClip.edge_detect = 1.0;
						if (payload.preset.effectType === "black_and_white") {
							targetClip.saturation = 0.0;
							targetClip.contrast = 1.2;
						}
						if (payload.preset.effectType === "cross_dissolve") {
							targetClip.transitions = targetClip.transitions || {};
							targetClip.transitions.in = 30;
							targetClip.transitions.out = 30;
						}
						onCommitUpdate(newProject);
					}
					return;
				} else {
					const startFrame = snap(Math.max(0, Math.floor(dropX / pxPerFrame)));
					newClip = {
						id: crypto.randomUUID(),
						...payload.preset,
						start_frame: startFrame,
						duration_frames: 100,
						layer: {
							scale: 1.0,
							position_x: 0,
							position_y: 0,
							rotation: 0,
							opacity: 1.0,
						},
					};
				}
			} else {
				const rawStartFrame = Math.max(0, Math.floor(dropX / pxPerFrame));
				const startFrame = snap(rawStartFrame);

				newClip = {
					id: `clip-${Date.now()}`,
					name: payload.name,
					start_frame: startFrame,
					duration_frames: payload.duration_frames,
					type: payload.assetType || payload.type, // Map assetType back to clip.type
					color:
						payload.color ||
						"bg-indigo-600/80 border-indigo-400 hover:bg-indigo-500",
					layer: {
						type: "solid",
						color: [Math.random(), Math.random(), Math.random(), 1.0],
					},
				};

				if (payload.peaks) {
					newClip.peaks = payload.peaks;
				}

				if (!newProject.tracks[trackIdx]) {
					newProject.tracks[trackIdx] = {
						id: `t-${trackIdx}`,
						name: `Track ${trackIdx + 1}`,
						clips: [],
					};
				}
				if (!newProject.tracks[trackIdx].clips) {
					newProject.tracks[trackIdx].clips = [];
				}
				newProject.tracks[trackIdx].clips.push(newClip);

				const clipEnd = startFrame + payload.duration_frames;
				if (clipEnd > (newProject.duration_frames || 0)) {
					newProject.duration_frames = clipEnd + 60;
				}
			}

			onCommitUpdate(newProject);
			if (payload.type !== "existing_clip") {
				onSelectClip?.(newClip.id);
			}
		} catch (err) {
			console.error("Drop failed:", err);
		}
	};

	const handleClipDragStart = (
		e: DragEvent<HTMLDivElement>,
		clip: any,
		trackIdx: number,
	) => {
		e.stopPropagation(); // prevent track from handling it
		if (project.tracks[trackIdx]?.isLocked) {
			e.preventDefault();
			return;
		}
		const rect = e.currentTarget.getBoundingClientRect();
		const offsetX = e.clientX - rect.left;

		e.dataTransfer.setData(
			"application/json",
			JSON.stringify({
				type: "existing_clip",
				clipId: clip.id,
				sourceTrackIdx: trackIdx,
				offsetX: offsetX,
			}),
		);
		e.dataTransfer.effectAllowed = "move";
	};

	// Generate timecode ruler marks
	const totalDuration = project.duration_frames || 300;
	const totalWidth = totalDuration * pxPerFrame;
	const rulerMarks: { x: number; label: string; isMajor: boolean }[] = [];

	// Calculate ideal interval based on zoom level
	const fps = 60;
	let stepFrames = 60; // 1 second
	if (pxPerFrame < 1)
		stepFrames = 600; // 10 seconds
	else if (pxPerFrame < 2)
		stepFrames = 300; // 5 seconds
	else if (pxPerFrame < 4)
		stepFrames = 120; // 2 seconds
	else if (pxPerFrame >= 6) stepFrames = 30; // 0.5 seconds

	for (let f = 0; f <= totalDuration; f += stepFrames) {
		const x = f * pxPerFrame;
		const totalSeconds = Math.floor(f / fps);
		const ss = totalSeconds % 60;
		const mm = Math.floor(totalSeconds / 60) % 60;
		const hh = Math.floor(totalSeconds / 3600);
		const isMajor = f % (stepFrames * 2) === 0;
		let label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
		if (hh > 0) label = `${hh}:${label}`;
		rulerMarks.push({ x, label, isMajor });
	}

	// Minimap computations
	const minimapHeight = 32;
	const minimapTrackHeight = Math.max(
		1,
		Math.min(4, minimapHeight / Math.max(1, project.tracks?.length || 1)),
	);
	const totalContentWidth = totalWidth + 128;
	const minimapViewWidth = Math.max(1, clientWidth - 128);
	const minimapRatio =
		totalContentWidth > 0 ? minimapViewWidth / totalContentWidth : 1;
	const viewportLeft = scrollLeft * minimapRatio;
	const viewportWidth = Math.min(minimapViewWidth, clientWidth * minimapRatio);

	const handleMinimapClick = (e: ReactMouseEvent<HTMLDivElement>) => {
		setIsDraggingMinimap(true);
		const rect = e.currentTarget.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const targetScrollLeft = clickX / minimapRatio - clientWidth / 2;
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollLeft = Math.max(0, targetScrollLeft);
		}
	};

	if (!project || !project.tracks) {
		return <div className="text-muted p-4 text-xs">No tracks</div>;
	}

	return (
		<div
			ref={scrollContainerRef}
			className="flex h-full w-full flex-col relative overflow-y-auto overflow-x-auto bg-background"
		>
			{/* Timeline Mini-Map (Navigator) */}
			<div
				className="h-8 bg-background border-b border-border flex sticky top-0 z-30 min-w-max"
				style={{ minWidth: `${totalWidth + 128}px` }}
			>
				<div className="w-32 h-full bg-background border-r border-border shrink-0 flex items-center px-2 sticky left-0 z-40">
					<span className="text-[10px] text-muted font-medium uppercase tracking-wider">
						Navigator
					</span>
				</div>
				<div
					className="flex-1 relative cursor-pointer hover:bg-background/50 transition-colors sticky left-32"
					style={{ width: `${minimapViewWidth}px` }}
					onMouseDown={handleMinimapClick}
					role="button"
					tabIndex={0}
				>
					{/* Render tracks & clips */}
					<div className="absolute inset-0 flex flex-col justify-center gap-[1px] py-1 opacity-60">
						{project.tracks?.map((track: any, i: number) => (
							<div
								key={i}
								className="w-full relative"
								style={{
									height: `${minimapTrackHeight}px`,
									backgroundColor: "rgba(255,255,255,0.05)",
								}}
							>
								{track.clips?.map((clip: any) => (
									<div
										key={clip.id}
										className="absolute top-0 bottom-0 rounded-sm bg-indigo-500"
										style={{
											left: `${(clip.start_frame || 0) * pxPerFrame * minimapRatio}px`,
											width: `${(clip.duration_frames || 100) * pxPerFrame * minimapRatio}px`,
										}}
									/>
								))}
							</div>
						))}
					</div>

					{/* Viewport Highlight */}
					<div
						className="absolute top-0 bottom-0 bg-white/20 border-x border-white/50 cursor-ew-resize pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.1)]"
						style={{
							left: `${viewportLeft}px`,
							width: `${viewportWidth}px`,
						}}
					/>
				</div>
			</div>

			{/* Timeline Timecodes Ruler */}
			<div
				className="h-6 min-w-max border-b border-border bg-background flex items-end relative sticky top-8 z-20"
				role="button"
				tabIndex={0}
				style={{ minWidth: `${totalWidth + 128}px` }}
				onMouseDown={(e) => {
					const rect = e.currentTarget.getBoundingClientRect();
					const x = e.clientX - rect.left - 128; // subtract track header
					if (x >= 0) {
						const f = Math.round(x / pxPerFrame);
						onChangeFrame(Math.max(0, Math.min(f, totalDuration - 1)));
					}
				}}
			>
				{/* Track header spacer */}
				<div className="w-32 h-full bg-background border-r border-border sticky left-0 z-20 flex items-center px-2">
					<span className="text-[10px] text-muted font-medium uppercase tracking-wider">
						Time
					</span>
				</div>
				{/* Ruler marks */}
				{rulerMarks.map((mark, i) => (
					<div
						key={i}
						className="absolute bottom-0 flex flex-col items-center"
						style={{ left: `${mark.x + 128}px` }}
					>
						<span
							className={`text-[10px] mb-0.5 select-none ${mark.isMajor ? "text-muted" : "text-secondary"}`}
						>
							{mark.label}
						</span>
						<div
							className={`w-px ${mark.isMajor ? "h-2 bg-hover" : "h-1 bg-panel"}`}
						/>
					</div>
				))}
				{/* Markers */}
				{markers.map((marker, i) => (
					<div
						key={`marker-${i}`}
						className="absolute bottom-0 flex flex-col items-center z-30 cursor-pointer group"
						style={{ left: `${marker.frame * pxPerFrame + 128}px` }}
						title={marker.label}
						onClick={(e) => {
							e.stopPropagation();
							onChangeFrame(marker.frame);
						}}
						onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
						role="button"
						tabIndex={0}
					>
						<span className="text-[8px] text-foreground bg-background/70 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-0.5">
							{marker.label}
						</span>
						<div
							className="w-2 h-2 rotate-45"
							style={{ backgroundColor: marker.color }}
						/>
					</div>
				))}
				{/* Cloud Comments (Frame.io Parity) */}
				{cloudComments.map((comment, i) => (
					<div
						key={`comment-${i}`}
						className="absolute bottom-1 flex flex-col items-center z-30 cursor-pointer group"
						style={{ left: `${comment.frame * pxPerFrame + 128}px` }}
						onClick={(e) => {
							e.stopPropagation();
							onChangeFrame(comment.frame);
						}}
						onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
						role="button"
						tabIndex={0}
					>
						<div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-panel border border-border shadow-xl rounded w-48 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-left z-50">
							<div className="flex items-center gap-2 mb-1">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={comment.avatar}
									alt="Avatar"
									className="w-4 h-4 rounded-full bg-glass"
								/>
								<span className="text-[9px] font-bold text-foreground">
									{comment.author}
								</span>
								<span className="text-[8px] text-muted ml-auto">
									{new Date(comment.timestamp).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							</div>
							<p className="text-[10px] text-foreground leading-tight">
								{comment.text}
							</p>
							<div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-panel border-b border-r border-border rotate-45" />
						</div>
						<div className="w-4 h-4 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)] border border-sky-300 flex items-center justify-center relative overflow-hidden">
							{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
								src={comment.avatar}
								alt="Author"
								className="w-full h-full object-cover"
							/>
						</div>
						<div className="w-px h-2 bg-sky-500 mt-0.5 shadow-[0_0_5px_rgba(14,165,233,0.8)]" />
					</div>
				))}
			</div>

			{/* Tracks Container */}
			<div className="flex flex-col gap-1 py-2 min-w-max relative">
				{project.tracks.map((track: any, trackIdx: number) => (
					<div
						key={track.id || trackIdx}
						className={`flex ${trackHeight === "sm" ? "h-8" : trackHeight === "lg" ? "h-24" : "h-12"} w-full items-center bg-panel/50 border-y border-border/50 relative ${track.isHidden ? "opacity-50" : ""} ${track.isLocked ? "bg-[url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==)]" : ""}`}
					>
						{/* Track Header */}
						<div
							className="w-32 h-full bg-background border-r border-border flex items-center justify-between px-2 sticky left-0 z-20 cursor-grab active:cursor-grabbing hover:bg-background transition-colors"
							style={{
								borderLeft: track.color
									? `4px solid ${track.color}`
									: "4px solid transparent",
							}}
							draggable
							onDragStart={(e) => {
								e.dataTransfer.setData(
									"application/vnd.lazynext.track",
									trackIdx.toString(),
								);
								e.dataTransfer.effectAllowed = "move";
							}}
							onDragOver={(e) => {
								// Only allow dropping tracks here, not clips
								if (
									e.dataTransfer.types.includes(
										"application/vnd.lazynext.track",
									)
								) {
									e.preventDefault();
								}
							}}
							onDrop={(e) => {
								const fromIdx = parseInt(
									e.dataTransfer.getData("application/vnd.lazynext.track"),
								);
								if (!isNaN(fromIdx) && fromIdx !== trackIdx) {
									onMoveTrack?.(fromIdx, trackIdx);
								}
							}}
							onContextMenu={(e) => {
								e.preventDefault();
								onContextMenuTrack?.(e, trackIdx);
							}}
						>
							<span
								className="text-xs font-medium text-muted truncate w-16 select-none"
								onDoubleClick={(e) => {
									e.stopPropagation();
									onRenameTrack?.(trackIdx, track.name);
								}}
								title="Double-click to rename"
							>
								{track.name}
							</span>
							<div className="flex items-center gap-1">
								<button
									onClick={(e) => {
										e.stopPropagation();
										onToggleTrackHide?.(trackIdx);
									}}
									title="Toggle Visibility"
									className={`p-1 hover:bg-panel rounded ${track.isHidden ? "text-muted" : "text-muted hover:text-foreground"}`}
								>
									<svg
										className="w-3 h-3"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										></path>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
										></path>
									</svg>
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onToggleTrackMute?.(trackIdx);
									}}
									title="Mute Audio"
									className={`p-1 hover:bg-panel rounded ${track.isMuted ? "text-red-400" : "text-muted hover:text-foreground"}`}
								>
									<svg
										className="w-3 h-3"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
											clipRule="evenodd"
										/>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
										/>
									</svg>
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onToggleTrackSolo?.(trackIdx);
									}}
									title="Solo Audio"
									className={`p-1 text-[10px] font-bold hover:bg-panel rounded ${track.isSoloed ? "text-yellow-400" : "text-muted hover:text-foreground"}`}
								>
									S
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onToggleTrackLock?.(trackIdx);
									}}
									title="Lock Track"
									className={`p-1 hover:bg-panel rounded ${track.isLocked ? "text-red-400" : "text-muted hover:text-foreground"}`}
								>
									<svg
										className="w-3 h-3"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="2"
											d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
										></path>
									</svg>
								</button>
							</div>
						</div>

						{/* Track Canvas */}
						<div
							className="flex-1 relative h-full cursor-text"
							onMouseDown={handleTimelineClick}
							onDragOver={handleDragOver}
							onDrop={(e) => handleDrop(e, trackIdx)}
						>
							{track.clips?.map((clip: any) => {
								const left = (clip.start_frame || 0) * pxPerFrame;
								const width = (clip.duration_frames || 100) * pxPerFrame;
								const colorClass =
									clip.color ||
									"bg-indigo-600/80 border-indigo-400 hover:bg-indigo-500";

								const isSelected =
									clip.id === selectedClipId ||
									selectedClipIds.includes(clip.id);
								const baseClass = `absolute top-1 bottom-1 rounded border shadow-sm flex items-center px-2 overflow-hidden z-10 cursor-pointer hover:brightness-110 active:brightness-90 ${colorClass} ${isQuantumSuperposition ? "animate-pulse" : ""}`;
								const selectedClass = isSelected
									? "ring-2 ring-white z-20 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
									: "";

								return (
									<motion.div
										layout
										initial={{ opacity: 0, scale: 0.95 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ type: "spring", stiffness: 300, damping: 30 }}
										key={clip.id}
										onDragStart={(e) => {
											if (activeTool === "select") {
												handleClipDragStart(e as unknown as DragEvent<HTMLDivElement>, clip, trackIdx);
											} else {
												e.preventDefault();
											}
										}}
										onMouseDown={(e: React.MouseEvent) => {
											if (
												activeTool === "slip" &&
												!track.isLocked &&
												(clip.type === "video" || clip.type === "audio")
											) {
												e.stopPropagation();
												setSlippingState({
													trackIdx,
													clipId: clip.id,
													initialX: e.clientX,
													initialMediaOffset: clip.media_offset_frames || 0,
												});
												onSelectClip?.(clip.id);
											} else if (activeTool === "slide" && !track.isLocked) {
												e.stopPropagation();

												const sortedClips = [...track.clips].sort(
													(a: any, b: any) =>
														(a.start_frame || 0) - (b.start_frame || 0),
												);
												const clipIdx = sortedClips.findIndex(
													(c: any) => c.id === clip.id,
												);

												const prevClip =
													clipIdx > 0 ? sortedClips[clipIdx - 1] : null;
												const nextClip =
													clipIdx < sortedClips.length - 1
														? sortedClips[clipIdx + 1]
														: null;

												setSlidingState({
													trackIdx,
													clipId: clip.id,
													initialX: e.clientX,
													initialStart: clip.start_frame || 0,
													prevClipId: prevClip?.id || null,
													prevInitialDuration: prevClip?.duration_frames || 0,
													nextClipId: nextClip?.id || null,
													nextInitialStart: nextClip?.start_frame || 0,
													nextInitialDuration: nextClip?.duration_frames || 0,
													nextInitialMediaOffset:
														nextClip?.media_offset_frames || 0,
												});
												onSelectClip?.(clip.id);
											}
										}}
										onClick={(e: React.MouseEvent) => {
											e.stopPropagation();
											if (!track.isLocked) {
												if (onClickClip && activeTool === "razor") {
													const rect = e.currentTarget.getBoundingClientRect();
													const clickX = e.clientX - rect.left;
													const frameAtClick =
														clip.start_frame + Math.floor(clickX / pxPerFrame);
													onClickClip(e, clip.id, frameAtClick);
												} else {
													if (e.shiftKey && onToggleSelectClip) {
														onToggleSelectClip(clip.id);
													} else {
														onSelectClip?.(clip.id);
													}
												}
											}
										}}
										onContextMenu={(e: React.MouseEvent) => {
											if (!track.isLocked) {
												onContextMenuClip?.(e, clip.id);
											}
										}}
										// Phase 50: Track & Clip Locking
										className={`${baseClass} ${selectedClass} transition-shadow duration-200 ${track.isLocked ? "cursor-not-allowed opacity-80" : ""} ${activeTool === "razor" && !track.isLocked ? "!cursor-crosshair" : ""} ${activeTool === "slip" && !track.isLocked ? "!cursor-ew-resize" : ""} ${clip.lockedBy ? "!cursor-not-allowed border-2 border-dashed" : ""}`}
										style={{
											left: `${left}px`,
											width: `${width}px`,
											backdropFilter: "blur(8px)",
										}}
										draggable={!track.isLocked && activeTool === "select"}
									>
										{/* Phase 50: Remote Lock Indicator */}
										{clip.lockedBy && (
											<div
												className="absolute top-0 right-0 bg-background/80 px-1 py-0.5 rounded-bl flex items-center gap-1 z-30"
												style={{ backgroundColor: clip.lockedColor }}
											>
												<svg
													className="w-2.5 h-2.5 text-foreground"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth="2"
														d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
													></path>
												</svg>
												<span className="text-[8px] font-bold text-foreground uppercase">
													{clip.lockedBy}
												</span>
											</div>
										)}
										{/* Phase 36: Quantum Superposition Ghost Layers */}
										{isQuantumSuperposition && (
											<>
												<div
													className="absolute inset-0 bg-fuchsia-500/30 mix-blend-screen blur-[2px] -translate-x-2 translate-y-1 animate-pulse pointer-events-none z-0"
													style={{ animationDuration: "0.3s" }}
												/>
												<div
													className="absolute inset-0 bg-cyan-500/30 mix-blend-screen blur-[2px] translate-x-2 -translate-y-1 animate-pulse pointer-events-none z-0"
													style={{
														animationDuration: "0.4s",
														animationDirection: "reverse",
													}}
												/>
											</>
										)}

										<div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
											{clip.type === "text" && (
												<div className="h-full flex items-center px-2 text-[10px] text-foreground opacity-50 overflow-hidden whitespace-nowrap">
													{clip.text_content}
												</div>
											)}
											{(clip.type === "audio" || clip.type === "video") &&
												(() => {
													const asset = assets.find(
														(a) =>
															a.id === clip.name ||
															a.name === clip.name ||
															a.id === clip.asset_id,
													);
													const peaks = asset?.peaks || clip.peaks;
													const content = [];

													if (clip.type === "video") {
														const thumbnail =
															asset?.thumbnail || clip.thumbnail;
														if (thumbnail) {
															content.push(
																/* eslint-disable-next-line @next/next/no-img-element */
																<img
																	key="thumb"
																	src={thumbnail}
																	className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
																	alt=""
																/>,
															);
														}
													}

													if (peaks) {
														content.push(
															<AudioWaveform
																key="wave"
																width={width}
																seed={clip.id}
																peaks={peaks}
															/>,
														);
													}
													return content;
												})()}
										</div>
										<div className="flex items-center gap-2 relative z-10 drop-shadow-md">
											<span className="text-[10px] text-foreground truncate font-medium">
												{clip.name}
											</span>
											{clip.playback_rate && clip.playback_rate !== 1.0 && (
												<span className="text-[10px] text-indigo-200 bg-indigo-900/50 px-1 rounded-sm border border-indigo-500/30">
													{clip.playback_rate.toFixed(2)}x
												</span>
											)}
										</div>

										{/* Automation Curve Overlay (Volume) */}
										{(() => {
											if (!clip.keyframes) return null;
											const volKeyframes = clip.keyframes
												.filter((k: any) => k.property === "volume")
												.sort((a: any, b: any) => a.frame - b.frame);
											if (volKeyframes.length === 0) return null;

											const points = volKeyframes.map((k: any) => {
												const x = k.frame * pxPerFrame;
												const y = 100 - (Math.min(2.0, k.value) / 2.0) * 100;
												return `${x},${y}`;
											});

											const startY =
												100 -
												(Math.min(2.0, volKeyframes[0].value) / 2.0) * 100;
											const endY =
												100 -
												(Math.min(
													2.0,
													volKeyframes[volKeyframes.length - 1].value,
												) /
													2.0) *
													100;

											return (
												<svg
													className="absolute inset-0 w-full h-full pointer-events-none opacity-70 z-10"
													viewBox={`0 0 ${width} 100`}
													preserveAspectRatio="none"
												>
													<polyline
														points={`0,${startY} ${points.join(" ")} ${width},${endY}`}
														fill="none"
														stroke="#fbbf24"
														strokeWidth="1.5"
														vectorEffect="non-scaling-stroke"
													/>
												</svg>
											);
										})()}

										{/* Transition Fades Overlay */}
										{clip.transitions?.in &&
											clip.transitions.in.duration_frames > 0 && (
												<div
													className="absolute left-0 top-0 bottom-0 bg-glass z-10 pointer-events-none"
													style={{
														width: `${clip.transitions.in.duration_frames * pxPerFrame}px`,
														clipPath: "polygon(0 100%, 100% 0, 100% 100%)",
													}}
												/>
											)}
										{clip.transitions?.out &&
											clip.transitions.out.duration_frames > 0 && (
												<div
													className="absolute right-0 top-0 bottom-0 bg-glass z-10 pointer-events-none"
													style={{
														width: `${clip.transitions.out.duration_frames * pxPerFrame}px`,
														clipPath: "polygon(0 0, 100% 100%, 0 100%)",
													}}
												/>
											)}

										{/* Generic Keyframe Dots */}
										{clip.keyframes?.map((kf: any, i: number) => {
											const kfLeft = kf.frame * pxPerFrame;
											let yPos = "80%";
											let color = "bg-white";
											if (kf.property === "volume") {
												yPos = `${100 - (Math.min(2.0, kf.value) / 2.0) * 100}%`;
												color = "bg-amber-400";
											}

											return (
												<div
													key={`kf-${i}`}
													className={`absolute w-1.5 h-1.5 ${color} rotate-45 shadow-sm z-20 pointer-events-none opacity-90`}
													style={{
														left: `${kfLeft}px`,
														top: yPos,
														transform: `translate(-50%, -50%) rotate(45deg)`,
													}}
												/>
											);
										})}

										{/* Clip Markers */}
										{clip.markers?.map((marker: any, i: number) => {
											const mLeft = marker.frameOffset * pxPerFrame;
											return (
												<div
													key={`cmark-${i}`}
													className="absolute top-0 bottom-0 w-px z-20 pointer-events-none group/marker flex flex-col items-center"
													style={{
														left: `${mLeft}px`,
														backgroundColor: marker.color || "#ec4899",
													}}
												>
													<div
														className="w-1.5 h-1.5 rotate-45 -mt-0.5"
														style={{
															backgroundColor: marker.color || "#ec4899",
														}}
													/>
													<div className="absolute top-2 left-1 text-[8px] bg-background/80 text-foreground px-1 rounded opacity-0 group-hover/marker:opacity-100 whitespace-nowrap">
														{marker.label}
													</div>
												</div>
											);
										})}

										{/* Left Trim Handle */}
										{!track.isLocked && (
											<div
												className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/40 cursor-ew-resize z-30 transition-colors"
												role="button"
												tabIndex={0}
												onMouseDown={(e) => {
													e.stopPropagation();
													setTrimmingState({
														trackIdx,
														clipId: clip.id,
														edge: "left",
														initialX: e.clientX,
														initialStart: clip.start_frame || 0,
														initialDuration: clip.duration_frames || 100,
														initialMediaOffset: clip.media_offset_frames || 0,
													});
												}}
											/>
										)}

										{/* Right Trim Handle */}
										{!track.isLocked && (
											<div
												className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/40 cursor-ew-resize z-30 transition-colors"
												role="button"
												tabIndex={0}
												onMouseDown={(e) => {
													e.stopPropagation();
													setTrimmingState({
														trackIdx,
														clipId: clip.id,
														edge: "right",
														initialX: e.clientX,
														initialStart: clip.start_frame || 0,
														initialDuration: clip.duration_frames || 100,
														initialMediaOffset: clip.media_offset_frames || 0,
													});
												}}
											/>
										)}
									</motion.div>
								);
							})}
						</div>
					</div>
				))}

				{/* Playhead Line */}
				<div
					className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
					style={{ transform: `translateX(${playheadX + 128}px)` }}
				>
					<div className="absolute -top-1 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45 pointer-events-auto cursor-ew-resize"></div>
				</div>
			</div>
		</div>
	);
}
