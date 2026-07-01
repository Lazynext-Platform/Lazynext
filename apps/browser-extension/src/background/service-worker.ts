/** @module background/service-worker Service worker for browser extension background script */
// Service Worker (Background Script)

let API_GATEWAY = "http://localhost:8005";
let AUTH_TOKEN = "";

// Restore the configured gateway URL and token from extension storage, falling
// back to the localhost default for development.
chrome.storage.local.get(["apiGatewayUrl", "authToken"], (items: { [key: string]: any }) => {
	if (items.apiGatewayUrl && typeof items.apiGatewayUrl === "string") {
		API_GATEWAY = items.apiGatewayUrl;
	}
	if (items.authToken && typeof items.authToken === "string") {
		AUTH_TOKEN = items.authToken;
	}
});

chrome.runtime.onInstalled.addListener(() => {
	console.log("Lazynext Extension Installed");

	chrome.contextMenus.create({
		id: "send-to-lazynext",
		title: "Send Video to Lazynext Timeline",
		contexts: ["video", "link"],
	});
});

chrome.contextMenus.onClicked.addListener(async (info, _tab) => {
	if (info.menuItemId === "send-to-lazynext") {
		const mediaUrl = info.srcUrl || info.linkUrl;
		if (!mediaUrl) return;

		const sourceName = new URL(mediaUrl).pathname.split("/").pop() || mediaUrl;
		console.log(`Sending media to Lazynext: ${mediaUrl}`);

		try {
			const headers: Record<string, string> = { "Content-Type": "application/json" };
			if (AUTH_TOKEN) {
				headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
			}
			const response = await fetch(
				`${API_GATEWAY}/api/v1/ai/ingest`,
				{
					method: "POST",
					headers,
					body: JSON.stringify({
						url: mediaUrl,
						crdtAction: "APPEND_TRACK",
					}),
				},
			);

			if (!response.ok) {
				console.error(`Gateway returned ${response.status}`);
				void chrome.notifications.create(`lazynext-err-${Date.now()}`, {
					type: "basic",
					iconUrl: "icons/icon48.png",
					title: "Lazynext — Import Failed",
					message: `API Gateway returned ${response.status}. Check your connection.`,
				});
				return;
			}
			const data = await response.json();
			console.log("Success:", data);
			void chrome.notifications.create(`lazynext-ok-${Date.now()}`, {
				type: "basic",
				iconUrl: "icons/icon48.png",
				title: "Sent to Lazynext",
				message: `"${sourceName}" added to your timeline.`,
			});
		} catch (error) {
			console.error("Failed to reach Lazynext API Gateway:", error);
			void chrome.notifications.create(`lazynext-err-${Date.now()}`, {
				type: "basic",
				iconUrl: "icons/icon48.png",
				title: "Lazynext — Offline",
				message: "Could not reach the API Gateway. Open the web app and retry.",
			});
		}
	}
});
