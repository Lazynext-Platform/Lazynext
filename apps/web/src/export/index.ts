/**
 * Export module — types, constants, and helpers for video export.
 *
 * Defines export formats (MP4, WebM), quality levels, and helper
 * functions for MIME type resolution, file extension lookup, and
 * client-side buffer download.
 *
 * @module export
 */

import type { FrameRate } from "lazynext-wasm";
import { EXPORT_MIME_TYPES } from "./mime-types";

/** Utility representing EXPORT_QUALITY_VALUES. */
export const EXPORT_QUALITY_VALUES = [
	"low",
	"medium",
	"high",
	"very_high",
] as const;

/** Utility representing EXPORT_FORMAT_VALUES. */
export const EXPORT_FORMAT_VALUES = ["mp4", "webm"] as const;

/** Type definition for ExportFormat. */
export type ExportFormat = (typeof EXPORT_FORMAT_VALUES)[number];
/** Type definition for ExportQuality. */
export type ExportQuality = (typeof EXPORT_QUALITY_VALUES)[number];

/** Type definition for ExportOptions. */
export interface ExportOptions {
	/** Export container format (mp4 or webm). */
	format: ExportFormat;
	/** Export quality preset. */
	quality: ExportQuality;
	/** Target frame rate (falls back to project fps). */
	fps?: FrameRate;
	/** Whether to include the audio track. */
	includeAudio?: boolean;
}

/** Type definition for ExportResult. */
export interface ExportResult {
	/** Whether the export completed successfully. */
	success: boolean;
	/** Rendered video buffer on success. */
	buffer?: ArrayBuffer;
	/** Error message on failure. */
	error?: string;
	/** Whether the export was cancelled by the user. */
	cancelled?: boolean;
}

/** Type definition for ExportState. */
export interface ExportState {
	/** Whether an export is currently in progress. */
	isExporting: boolean;
	/** Export progress in range [0, 1]. */
	progress: number;
	/** Final export result, set when complete. */
	result: ExportResult | null;
}

/** Utility representing getExportMimeType. */
export function getExportMimeType({
	format,
}: {
	format: ExportFormat;
}): string {
	return EXPORT_MIME_TYPES[format];
}

/** Utility representing getExportFileExtension. */
export function getExportFileExtension({
	format,
}: {
	format: ExportFormat;
}): string {
	return `.${format}`;
}

/** Utility representing downloadBuffer. */
export function downloadBuffer({
	buffer,
	filename,
	mimeType,
}: {
	buffer: ArrayBuffer;
	filename: string;
	mimeType: string;
}): void {
	const blob = new Blob([buffer], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const downloadLink = document.createElement("a");
	downloadLink.href = url;
	downloadLink.download = filename;
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
	URL.revokeObjectURL(url);
}
