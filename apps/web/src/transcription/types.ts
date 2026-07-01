/**
 * @module transcription/types
 * @description Core type definitions for the transcription subsystem.
 */

import type { LanguageCode } from "./languages";

/** A language code or `"auto"` for automatic detection. */
export type TranscriptionLanguage = LanguageCode | "auto";

/** A single timed segment of transcribed text. */
export interface TranscriptionSegment {
	text: string;
	start: number;
	end: number;
}

/** The full result from a transcription run. */
export interface TranscriptionResult {
	text: string;
	segments: TranscriptionSegment[];
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
	status: TranscriptionStatus;
	progress: number;
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
	id: TranscriptionModelId;
	name: string;
	huggingFaceId: string;
	description: string;
}

/** A timestamped caption chunk ready for timeline display. */
export interface CaptionChunk {
	text: string;
	startTime: number;
	duration: number;
}
