/**
 * Frame-streaming export client.
 *
 * Renders the timeline frame-by-frame in the browser (via the same WASM GPU
 * compositor used for preview → WYSIWYG) and streams the resulting RGBA bytes
 * to the render-service, which pipes them to ffmpeg and encodes to the chosen
 * format (mp4 / prores / mov / …).
 *
 * The render-service owns encoding; the browser owns rendering. This matches
 * the project invariant "Rust owns all logic" — the WASM compositor (Rust)
 * does the rendering, render-service (wrapping the Rust export pipeline) does
 * the encoding.
 *
 * Backpressure: if the render-service returns 503 (frame buffer full), we pause
 * and retry with exponential backoff rather than flooding memory.
 */

const MAX_FRAME_BYTES_DEFAULT = 1920 * 1080 * 4;

export interface StreamProgress {
	/** 0..1 fraction of frames streamed. */
	fraction: number;
	/** Last streamed frame index. */
	frame: number;
}

export interface StreamFramesOptions {
	frameEndpoint: string;
	endEndpoint: string;
	totalFrames: number;
	width: number;
	height: number;
	/**
	 * Renders frame `index` to the compositor canvas and returns its RGBA
	 * pixels. The caller controls HOW a frame is rendered (so it can reuse the
	 * editor's existing render path).
	 */
	captureFrame: (index: number) => Promise<Uint8Array>;
	onProgress?: (progress: StreamProgress) => void;
	signal?: AbortSignal;
	maxFrameBytes?: number;
	maxRetries?: number;
}

/**
 * Stream all frames to the render-service and finalize the job.
 * Resolves when `/frames/end` reports the job complete.
 */
export async function streamFramesToRenderService(
	options: StreamFramesOptions,
): Promise<{ ok: true }> {
	const {
		frameEndpoint,
		endEndpoint,
		totalFrames,
		width,
		height,
		captureFrame,
		onProgress,
		signal,
		maxFrameBytes = MAX_FRAME_BYTES_DEFAULT,
		maxRetries = 8,
	} = options;

	const expected = width * height * 4;
	if (expected > maxFrameBytes && maxFrameBytes > 0) {
		// Informational only — we still attempt the stream; the server enforces
		// its own cap (EXPORT_FRAME_STREAM_MAX_BYTES) and will 503 if needed.
		console.warn(
			`[frame-stream] Frame size ${expected}B exceeds soft cap ${maxFrameBytes}B`,
		);
	}

	for (let index = 0; index < totalFrames; index++) {
		if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

		const rgba = await captureFrame(index);

		if (rgba.length !== expected) {
			throw new Error(
				`Frame ${index} has wrong size: expected ${expected} bytes, got ${rgba.length}`,
			);
		}

		await uploadFrameWithRetry({
			frameEndpoint,
			index,
			rgba,
			maxRetries,
			signal,
		});

		onProgress?.({
			fraction: (index + 1) / totalFrames,
			frame: index,
		});
	}

	// Finalize: tell render-service no more frames are coming → encode.
	const endResponse = await fetch(endEndpoint, {
		method: "POST",
		signal,
	});
	if (!endResponse.ok) {
		throw new Error(
			`/frames/end failed: ${endResponse.status} ${await endResponse.text().catch(() => "")}`,
		);
	}

	return { ok: true };
}

interface UploadFrameArgs {
	frameEndpoint: string;
	index: number;
	rgba: Uint8Array;
	maxRetries: number;
	signal?: AbortSignal;
}

async function uploadFrameWithRetry({
	frameEndpoint,
	index,
	rgba,
	maxRetries,
	signal,
}: UploadFrameArgs): Promise<void> {
	let attempt = 0;
	// eslint-disable-next-line no-constant-condition
	while (true) {
		if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

		// Copy into a fresh ArrayBuffer so the body type is accepted across TS
		// lib versions (Uint8Array<ArrayBufferLike> is not assignable to BodyInit
		// under the stricter 5.7 lib typings; ArrayBuffer always is).
		const buffer = new ArrayBuffer(rgba.byteLength);
		new Uint8Array(buffer).set(rgba);

		const response = await fetch(frameEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/octet-stream",
				"X-Frame-Seq": String(index),
			},
			body: buffer,
			signal,
		});

		if (response.ok) return;

		if (response.status === 503 && attempt < maxRetries) {
			// Backpressure — server buffer full. Pause and retry.
			const delayMs = Math.min(100 * 2 ** attempt, 2000);
			await sleep({ ms: delayMs, signal });
			attempt++;
			continue;
		}

		// Out-of-order (400) or other error — unrecoverable.
		throw new Error(
			`Frame ${index} upload failed: ${response.status} ${await response.text().catch(() => "")}`,
		);
	}
}

function sleep({
	ms,
	signal,
}: {
	ms: number;
	signal?: AbortSignal;
}): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(new DOMException("Aborted", "AbortError"));
			},
			{ once: true },
		);
	});
}
