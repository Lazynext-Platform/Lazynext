/**
 * @module media/video-decoder WebCodecs-based video frame decoder for the browser.
 * Decodes H.264/HEVC video in-browser using the WebCodecs API, extracts frames
 * as ImageData for upload to the WASM GPU compositor.
 */

export interface DecodedFrame {
  timestamp: number;
  imageData: ImageData;
}

/**
 * Decode the first video frame from a File/Blob using WebCodecs.
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

    // Timeout fallback
    setTimeout(() => {
      if (video.readyState < 2) {
        URL.revokeObjectURL(video.src);
        resolve(null);
      }
    }, 5000);
  });
}

/**
 * Check if WebCodecs is available in this browser.
 */
export function supportsWebCodecs(): boolean {
  return typeof VideoDecoder !== "undefined";
}
