/**
 * @module transcription/types
 * @description Core type definitions for the transcription subsystem.
 */

import type { LanguageCode } from "./languages";

/** A language code or `"auto"` for automatic detection. */
export type TranscriptionLanguage = LanguageCode | "auto";

/** A single timed segment of transcribed text. */
export interface TranscriptionSegment {
	/** Transcribed text for this segment. */
	text: string;
	/** Segment start time in seconds. */
	start: number;
	/** Segment end time in seconds. */
	end: number;
}

/** The full result from a transcription run. */
export interface TranscriptionResult {
	/** Full concatenated transcription text. */
	text: string;
	/** Individual timed segments. */
	segments: TranscriptionSegment[];
	/** Detected or selected language code. */
	language: string;
}

/** Lifecycle status of an in-progress transcription. */
export type TranscriptionStatus =
	| "idle"
	| "loading-model"
	| "transcribing"
	| "complete"
	| "error";

/** Progress of a transcription job (0–1). */
export interface TranscriptionProgress {
	/** Current lifecycle status of the job. */
	status: TranscriptionStatus;
	/** Progress value in range [0, 1]. */
	progress: number;
	/** Optional human-readable status message. */
	message?: string;
}

/** Available Whisper model IDs. */
export type TranscriptionModelId =
	| "whisper-tiny"
	| "whisper-small"
	| "whisper-medium"
	| "whisper-large-v3-turbo";

/** Metadata describing a transcription model. */
export interface TranscriptionModel {
	/** Model identifier key. */
	id: TranscriptionModelId;
	/** Human-readable model name. */
	name: string;
	/** Modal model ID for downloading. */
	modalId: string;
	/** Short description of the model. */
	description: string;
}

/** A timestamped caption chunk ready for timeline display. */
export interface CaptionChunk {
	/** Caption text content. */
	text: string;
	/** Start time in seconds. */
	startTime: number;
	/** Duration in seconds. */
	duration: number;
}
