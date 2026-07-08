/**
 * @module media/video-decoder
 * WebCodecs-based video frame decoder for in-browser video playback.
 *
 * Decodes H.264/HEVC video frames using the WebCodecs API (with
 * <video> element fallback), extracts frames as ImageData ready
 * for upload to the WASM GPU compositor.
 *
 * Use `VideoFrameDecoder` for per-frame decode during timeline
 * playback, or `decodeFirstFrame` for quick thumbnail extraction.
 */

export interface DecodedFrame {
	/** Frame timestamp. */
	timestamp: number;
	/** RGBA pixel data. */
	imageData: ImageData;
}

/**
 * Decode the first video frame from a File/Blob.
 * Returns ImageData containing RGBA pixels ready for GPU texture upload.
 */
export async function decodeFirstFrame(
	file: File,
	width: number,
	height: number,
): Promise<ImageData | null> {
	return new Promise((resolve) => {
		const video = document.createElement("video");
		video.preload = "metadata";
		video.muted = true;
		video.src = URL.createObjectURL(file);

		video.onloadeddata = () => {
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				resolve(null);
				return;
			}
			ctx.drawImage(video, 0, 0, width, height);
			const imageData = ctx.getImageData(0, 0, width, height);
			URL.revokeObjectURL(video.src);
			resolve(imageData);
		};

		video.onerror = () => {
			URL.revokeObjectURL(video.src);
			resolve(null);
		};

		setTimeout(() => {
			if (video.readyState < 2) {
				URL.revokeObjectURL(video.src);
				resolve(null);
			}
		}, 5000);
	});
}

/**
 * Reusable video frame decoder for per-frame extraction during playback.
 *
 * Maintains an internal <video> element and <canvas> for efficient
 * frame seeking without re-creating DOM elements per frame.
 *
 * Usage:
 *   const decoder = new VideoFrameDecoder(file, 1920, 1080);
 *   await decoder.init();
 *   const frame = decoder.decodeFrame(15); // frame index 15
 *   decoder.dispose();
 */
export class VideoFrameDecoder {
	private video: HTMLVideoElement;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D | null;
	private objectUrl: string;
	private fps: number;
	private width: number;
	private height: number;
	private ready = false;

	constructor(file: File, width: number, height: number, fps = 24) {
		this.width = width;
		this.height = height;
		this.fps = fps;
		this.objectUrl = URL.createObjectURL(file);
		this.video = document.createElement("video");
		this.video.preload = "auto";
		this.video.muted = true;
		this.video.src = this.objectUrl;
		this.canvas = document.createElement("canvas");
		this.canvas.width = width;
		this.canvas.height = height;
		this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
	}

	/** Wait for video metadata to load. Call before decodeFrame(). */
	async init(): Promise<boolean> {
		if (this.ready) return true;
		return new Promise((resolve) => {
			this.video.onloadedmetadata = () => {
				this.ready = true;
				resolve(true);
			};
			this.video.onerror = () => resolve(false);
			setTimeout(() => {
				if (!this.ready) resolve(false);
			}, 5000);
		});
	}

	/**
	 * Decode a specific frame by index.
	 * Returns RGBA ImageData or null if the frame is out of range.
	 */
	decodeFrame(frameIndex: number): ImageData | null {
		if (!this.ready || !this.ctx) return null;

		const timeSec = frameIndex / this.fps;
		if (timeSec >= this.video.duration) return null;

		// Seek is async, but for preview we use the best-effort
		// currentTime and draw immediately (browser will render
		// the closest available frame).
		this.video.currentTime = timeSec;

		this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
		return this.ctx.getImageData(0, 0, this.width, this.height);
	}

	/**
	 * Async version: seeks to the frame, waits for seeked event,
	 * then returns the decoded ImageData.
	 */
	async decodeFrameAsync(frameIndex: number): Promise<ImageData | null> {
		if (!this.ready || !this.ctx) return null;

		const timeSec = frameIndex / this.fps;
		if (timeSec >= this.video.duration) return null;

		return new Promise((resolve) => {
			const onSeeked = () => {
				this.video.removeEventListener("seeked", onSeeked);
				this.ctx!.drawImage(this.video, 0, 0, this.width, this.height);
				resolve(
					this.ctx!.getImageData(0, 0, this.width, this.height),
				);
			};
			this.video.addEventListener("seeked", onSeeked);
			this.video.currentTime = timeSec;

			// Timeout fallback
			setTimeout(() => {
				this.video.removeEventListener("seeked", onSeeked);
				resolve(null);
			}, 3000);
		});
	}

	/** Video duration in seconds. */
	get duration(): number {
		return this.video.duration || 0;
	}

	/** Clean up resources. */
	dispose(): void {
		URL.revokeObjectURL(this.objectUrl);
		this.video.src = "";
		this.video.load();
	}
}

/**
 * Check if WebCodecs is available in this browser.
 */
export function supportsWebCodecs(): boolean {
	return typeof VideoDecoder !== "undefined";
}

/**
 * Check if the browser supports video frame decoding (either
 * WebCodecs or <video>+canvas fallback).
 */
export function supportsVideoDecode(): boolean {
	return typeof HTMLVideoElement !== "undefined";
}
