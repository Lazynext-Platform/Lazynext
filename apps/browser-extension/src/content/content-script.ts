/** @module content/content-script Content script for browser extension video detection */

/** Retrieve the stored JWT token from extension storage, or null if not authenticated. */
async function getAuthToken(): Promise<string | null> {
	try {
		const result = (await chrome.storage.local.get("authToken")) as {
			authToken?: string;
		};
		return result.authToken || null;
	} catch {
		return null;
	}
}

/** Build request headers with the stored auth token for API Gateway calls. */
async function authHeaders(): Promise<Record<string, string>> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	const token = await getAuthToken();
	if (token) {
		headers["Authorization"] = `Bearer ${token}`;
	}
	return headers;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.type === "EXTRACT_VIDEO") {
		const videoElements = document.querySelectorAll("video");
		const videoData = Array.from(videoElements).map((v, i) => ({
			id: `video-${i}`,
			src: v.src || v.querySelector("source")?.src || null,
			currentTime: v.currentTime,
			duration: v.duration,
			width: v.videoWidth,
			height: v.videoHeight,
		}));
		sendResponse({
			videosFound: videoElements.length,
			videos: videoData,
		});
	} else if (message.type === "RECORD_VIDEO") {
		const videoIndex = message.videoIndex || 0;
		const video = document.querySelectorAll("video")[videoIndex];
		if (!video) {
			sendResponse({ success: false, error: "Video not found" });
			return;
		}

		try {
			const stream = (video as HTMLVideoElement & { captureStream?(): MediaStream; mozCaptureStream?(): MediaStream }).captureStream
				? (video as HTMLVideoElement & { captureStream(): MediaStream }).captureStream()
				: (video as HTMLVideoElement & { mozCaptureStream?(): MediaStream }).mozCaptureStream
					? (video as HTMLVideoElement & { mozCaptureStream(): MediaStream }).mozCaptureStream()
					: null;
			if (!stream) {
				sendResponse({
					success: false,
					error: "captureStream not supported on this video",
				});
				return;
			}

			const recorder = new MediaRecorder(stream, {
				mimeType: "video/webm",
			});
			let chunkIndex = 0;
			const sessionId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

			recorder.ondataavailable = async (e) => {
				if (e.data.size === 0) return;
				const idx = chunkIndex++;

				try {
					const gatewayUrlResult = (await chrome.storage.local.get(
						"apiGatewayUrl",
					)) as { apiGatewayUrl?: string };
					const apiGateway =
						gatewayUrlResult.apiGatewayUrl || "http://localhost:8005";

					const token = await getAuthToken();
					const headers: Record<string, string> = {};
					if (token) {
						headers["Authorization"] = `Bearer ${token}`;
					}

					const formData = new FormData();
					formData.append("chunk", e.data, `chunk_${idx}.webm`);
					formData.append("session_id", sessionId);
					formData.append("chunk_index", String(idx));
					formData.append("source", "browser-extension");

					await fetch(`${apiGateway}/api/v1/ingest/stream`, {
						method: "POST",
						headers,
						body: formData,
					});
				} catch {
					console.warn(
						`[Lazynext] Chunk ${idx} queued locally (gateway unreachable)`,
					);
				}
			};

			recorder.onstop = async () => {
				try {
					const gatewayUrlResult = (await chrome.storage.local.get(
						"apiGatewayUrl",
					)) as { apiGatewayUrl?: string };
					const apiGateway =
						gatewayUrlResult.apiGatewayUrl || "http://localhost:8005";

					const headers = await authHeaders();
					await fetch(`${apiGateway}/api/v1/ingest/stream/complete`, {
						method: "POST",
						headers,
						body: JSON.stringify({ session_id: sessionId }),
					});
				} catch (e) {
					console.warn("[Lazynext] Failed to finalize stream:", e);
				}

				chrome.runtime.sendMessage({
					type: "RECORDING_COMPLETE",
					sessionId,
					totalChunks: chunkIndex,
				});
			};

			recorder.start(1000);

			const duration = message.duration || 10000;
			setTimeout(() => {
				if (recorder.state === "recording") {
					recorder.stop();
				}
			}, duration);

			sendResponse({
				success: true,
				message: "Streaming recording started",
				sessionId,
			});
		} catch (err: any) {
			sendResponse({ success: false, error: err.message });
		}
	} else if (message.type === "INJECT_OVERLAY") {
		let container = document.getElementById("lazynext-overlay-container");
		if (!container) {
			container = document.createElement("div");
			container.id = "lazynext-overlay-container";
			container.style.position = "fixed";
			container.style.bottom = "0";
			container.style.left = "0";
			container.style.width = "100vw";
			container.style.height = "300px";
			container.style.zIndex = "999999";
			container.style.boxShadow = "0 -4px 20px rgba(0,0,0,0.5)";

			const iframe = document.createElement("iframe");
			iframe.src = chrome.runtime.getURL("overlay.html");
			iframe.style.width = "100%";
			iframe.style.height = "100%";
			iframe.style.border = "none";

			container.appendChild(iframe);
			document.body.appendChild(container);
		}
		sendResponse({ success: true });
	}
	return true;
});

window.addEventListener("message", (event) => {
	if (event.data?.type === "CLOSE_OVERLAY") {
		const container = document.getElementById("lazynext-overlay-container");
		if (container) {
			container.remove();
		}
	}
});
