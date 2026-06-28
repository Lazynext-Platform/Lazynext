import { wasmBridge } from "../core/wasm-bridge";

export async function dispatchExport(
    width: number,
    height: number,
    durationFrames: number,
    fps: number,
    onProgress: (progress: number) => void
): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            resolve(blob);
        };
        
        recorder.onerror = (e) => reject(e);
        recorder.start();

        // Render loop
        let currentFrame = 0;
        
        const renderNextFrame = async () => {
            if (currentFrame >= durationFrames) {
                recorder.stop();
                return;
            }
            
            try {
                await wasmBridge.renderToCanvas(canvas, currentFrame);
                onProgress(currentFrame / durationFrames);
                
                // HACK: MediaRecorder relies on real-time capturing from the stream, 
                // so we have to wait for a tick to ensure the frame is encoded.
                // In a production WebCodecs pipeline, we would pipe VideoFrames to an encoder.
                setTimeout(() => {
                    currentFrame++;
                    requestAnimationFrame(renderNextFrame);
                }, 1000 / fps);
            } catch (err) {
                recorder.stop();
                reject(err);
            }
        };

        renderNextFrame();
    });
}
