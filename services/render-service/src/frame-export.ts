/**
 * Frame-stream export job manager.
 *
 * The browser renders the timeline frame-by-frame via the WASM GPU compositor
 * (WYSIWYG) and streams RGBA frames here. This module:
 *   - holds an in-memory ordered frame buffer per job,
 *   - builds format-aware ffmpeg args for rawvideo-on-stdin encoding
 *     (mirroring rust/crates/export/src/encoder.rs so the two paths agree),
 *   - spawns ffmpeg on finalize, writes the buffered frames, and produces the
 *     encoded output file.
 *
 * The ffmpeg arg matrix MUST stay in sync with `encoder.rs::build_ffmpeg_args`.
 */

import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

/** Type definition for ExportFormatId. */
export type ExportFormatId = "mp4" | "prores" | "dcp" | "aaf" | "mov";

/** Type definition for FrameJobConfig. */
export interface FrameJobConfig {
	/** Unique job identifier. */
	jobId: string;
	/** Parent project identifier. */
	projectId: string;
	/** Target export format. */
	format: ExportFormatId;
	/** Video bitrate in kilobits per second. */
	bitrateKbps: number;
	/** Output width in pixels. */
	width: number;
	/** Output height in pixels. */
	height: number;
	/** Frames per second. */
	framerate: number;
	/** Total number of frames to encode. */
	totalFrames: number;
}

/** Type definition for FrameJobStatus. */
export type FrameJobStatus =
	| "awaiting_frames"
	| "encoding"
	| "completed"
	| "failed"
	| "cancelled";

/** Type definition for FrameJob. */
export interface FrameJob extends FrameJobConfig {
	/** Current job status. */
	status: FrameJobStatus;
	/** Encoding progress from 0 to 1. */
	progress: number;
	/** Buffered frame data ordered by sequence number. */
	frames: Buffer[]; // ordered by X-Frame-Seq
	/** Next expected sequence number. */
	nextSeq: number; // expected next sequence number
	/** Absolute path to the encoded output file. */
	outputPath: string | null;
	/** ISO-8601 job creation timestamp. */
	createdAt: string;
	/** Active ffmpeg child process, if encoding. */
	ffmpeg: ChildProcess | null;
}

/** Type definition for EncodeArgsResult. */
export interface EncodeArgsResult {
	/** ffmpeg video codec name. */
	codec: string;
	/** Pixel format for the output. */
	pixFmt: string;
	/** Format-specific extra ffmpeg flags. */
	extra: string[]; // format-specific flags (preset, crf, profile, color…)
}

const JOBS = new Map<string, FrameJob>();

/** Utility representing OUTPUT_DIR. */
export const OUTPUT_DIR =
	process.env.OUTPUT_DIR || path.join(import.meta.dirname, "../outputs");

/** Format → codec + pix_fmt + extras. Mirrors encoder.rs. */
export function codecForFormat(format: ExportFormatId): EncodeArgsResult {
	switch (format) {
		case "mp4":
		case "mov":
			return {
				codec: "libx264",
				pixFmt: "yuv420p",
				extra: ["-preset", "medium", "-crf", "18"],
			};
		case "prores":
			return {
				codec: "prores_ks",
				pixFmt: "yuv422p10le",
				extra: ["-profile:v", "3"],
			};
		case "dcp":
			return {
				codec: "jpeg2000",
				pixFmt: "xyz12le",
				extra: ["-color_primaries", "smpte431", "-color_trc", "gamma28"],
			};
		case "aaf":
			return {
				codec: "dnxhd",
				pixFmt: "yuv422p",
				extra: [],
			};
	}
}

/** Builds the full ffmpeg argv for rawvideo RGBA-on-stdin → encoded output. */
export function buildRawVideoEncodeArgs(
	config: FrameJobConfig,
	outputPath: string,
): string[] {
	const { codec, pixFmt, extra } = codecForFormat(config.format);
	const args: string[] = [
		"-y",
		"-f",
		"rawvideo",
		"-pix_fmt",
		"rgba",
		"-s",
		`${config.width}x${config.height}`,
		"-r",
		String(config.framerate),
		"-i",
		"-", // stdin
		"-c:v",
		codec,
		...extra,
		"-pix_fmt",
		pixFmt,
	];
	if (config.bitrateKbps > 0) {
		args.push("-b:v", `${config.bitrateKbps}k`);
	}
	args.push(outputPath);
	return args;
}

/** Create a new frame-stream export job and register it in the in-memory map. */
export function createFrameJob(config: FrameJobConfig): FrameJob {
	const job: FrameJob = {
		...config,
		status: "awaiting_frames",
		progress: 0,
		frames: [],
		nextSeq: 0,
		outputPath: null,
		createdAt: new Date().toISOString(),
		ffmpeg: null,
	};
	JOBS.set(config.jobId, job);
	return job;
}

/** Look up a frame-stream job by ID. */
export function getFrameJob(jobId: string): FrameJob | undefined {
	return JOBS.get(jobId);
}

/** Cancel a frame-stream job, killing any running ffmpeg process. */
export function deleteFrameJob(jobId: string): boolean {
	const job = JOBS.get(jobId);
	if (!job) return false;
	if (job.ffmpeg) {
		try {
			job.ffmpeg.kill("SIGKILL");
		} catch {
			/* ignore */
		}
	}
	JOBS.delete(jobId);
	return true;
}

/** Type definition for AppendResult. */
export interface AppendResult {
	/** Whether the frame was accepted. */
	ok: boolean;
	/** HTTP status code hint. */
	status: number; // http status hint
	/** Error description if not ok. */
	error?: string;
}

/** Appends one RGBA frame, enforcing strict in-order sequence. */
export function appendFrame(
	jobId: string,
	seq: number,
	data: Buffer,
	expectedFrameBytes: number,
	maxBufferBytes: number,
): AppendResult {
	const job = JOBS.get(jobId);
	if (!job) return { ok: false, status: 404, error: "Job not found" };
	if (job.status !== "awaiting_frames") {
		return {
			ok: false,
			status: 409,
			error: `Job not accepting frames (status: ${job.status})`,
		};
	}
	if (data.length !== expectedFrameBytes) {
		return {
			ok: false,
			status: 400,
			error: `Frame size mismatch: expected ${expectedFrameBytes}, got ${data.length}`,
		};
	}
	if (seq !== job.nextSeq) {
		return {
			ok: false,
			status: 400,
			error: `Out-of-order frame: expected seq ${job.nextSeq}, got ${seq}`,
		};
	}
	// Backpressure: reject 503 if buffer exceeds cap
	const currentBytes = job.frames.reduce((s, f) => s + f.length, 0);
	if (maxBufferBytes > 0 && currentBytes + data.length > maxBufferBytes) {
		return {
			ok: false,
			status: 503,
			error: "Backpressure: frame buffer full",
		};
	}
	job.frames.push(data);
	job.nextSeq++;
	job.progress = Math.min(0.99, job.frames.length / job.totalFrames);
	return { ok: true, status: 200 };
}

/**
 * Finalizes a job: spawns ffmpeg, writes buffered frames to stdin, encodes.
 * Resolves with the output path. Used by the /frames/end route.
 */
export function finalizeFrameJob(
	jobId: string,
	renderTimeoutMs: number,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const job = JOBS.get(jobId);
		if (!job) return reject(new Error("Job not found"));
		if (job.status !== "awaiting_frames") {
			return reject(new Error(`Job not finalizable (status: ${job.status})`));
		}

		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		}
		const ext = job.format === "dcp" ? "mxf" : job.format === "aaf" ? "aaf" : job.format === "prores" ? "mov" : "mp4";
		const outputPath = path.join(OUTPUT_DIR, `${job.jobId}.${ext}`);
		job.outputPath = outputPath;
		job.status = "encoding";

		const args = buildRawVideoEncodeArgs(job, outputPath);
		const ffmpeg = spawn("ffmpeg", args, { timeout: renderTimeoutMs });
		job.ffmpeg = ffmpeg;

		const stdin = ffmpeg.stdin;
		if (!stdin) {
			job.status = "failed";
			ffmpeg.kill();
			return reject(new Error("Failed to open ffmpeg stdin"));
		}

		ffmpeg.on("close", (code) => {
			if (code === 0) {
				job.status = "completed";
				job.progress = 1;
				resolve(outputPath);
			} else {
				job.status = "failed";
				reject(new Error(`ffmpeg exited with code ${code}`));
			}
		});

		ffmpeg.on("error", (err) => {
			job.status = "failed";
			reject(err);
		});

		// Write all buffered frames with backpressure handling.
		let frameIdx = 0;
		const nextFrame = () => {
			while (frameIdx < job.frames.length) {
				const ok = stdin.write(job.frames[frameIdx]);
				frameIdx++;
				if (!ok) {
					stdin.once("drain", nextFrame);
					return;
				}
			}
			stdin.end();
		};
		nextFrame();
	});
}
