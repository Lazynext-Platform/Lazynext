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

export const EXPORT_QUALITY_VALUES = [
	"low",
	"medium",
	"high",
	"very_high",
] as const;

export const EXPORT_FORMAT_VALUES = ["mp4", "webm"] as const;

export type ExportFormat = (typeof EXPORT_FORMAT_VALUES)[number];
export type ExportQuality = (typeof EXPORT_QUALITY_VALUES)[number];

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

export interface ExportState {
	/** Whether an export is currently in progress. */
	isExporting: boolean;
	/** Export progress in range [0, 1]. */
	progress: number;
	/** Final export result, set when complete. */
	result: ExportResult | null;
}

export function getExportMimeType({
	format,
}: {
	format: ExportFormat;
}): string {
	return EXPORT_MIME_TYPES[format];
}

export function getExportFileExtension({
	format,
}: {
	format: ExportFormat;
}): string {
	return `.${format}`;
}

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
